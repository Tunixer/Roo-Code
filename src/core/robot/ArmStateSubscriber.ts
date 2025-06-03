import { EventEmitter } from "events"
import { RobotArmState } from "./types"
import { ToolResponse } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"
import { Subscriber as ZMQSubscriber, Request as ZMQRequest, Dealer as ZMQDealer } from "zeromq"
import { ParseRobotStateData } from "./message/ArmState"
import { parseNetworkInfo, ipv4InfoToEndpoint } from "./message/NetworkInfo"

export interface ArmStateSubscriberEvents {
	stateUpdate: [state: RobotArmState]
	error: [error: Error]
	connected: []
	disconnected: []
	connectionStatusChanged: [status: "disconnected" | "connecting" | "connected" | "error", error?: string]
}

export interface ConnectionConfig {
	ipAddress: string
	port: number
	topic?: string
	messageTimeout?: number // 消息接收超时时间（毫秒），默认10秒
	maxConsecutiveTimeouts?: number // 最大连续超时次数，默认3次
}

export interface RobotArmControllerParams {
	command: string
	data?: any
}

export class ArmStateSubscriber extends EventEmitter<ArmStateSubscriberEvents> {
	private isConnected = false
	private isConnecting = false
	private reconnectTimer?: NodeJS.Timeout
	private mockDataTimer?: NodeJS.Timeout
	private readonly reconnectInterval = 5000 // 5 seconds
	private currentConfig?: ConnectionConfig
	private provider: any // ClineProvider instance
	private zmq_server: ZMQRequest
	private zmq_dealer: ZMQDealer
	private zmq_subscriber: ZMQSubscriber
	constructor(
		provider?: any,
		private readonly defaultConfig: ConnectionConfig = {
			ipAddress: "localhost",
			port: 5555,
			topic: "arm_state",
			messageTimeout: 10000, // 10秒
			maxConsecutiveTimeouts: 3, // 最大3次连续超时
		},
	) {
		super()
		this.currentConfig = { ...defaultConfig }
		this.provider = provider
		this.zmq_server = new ZMQRequest()
		this.zmq_dealer = new ZMQDealer()
		this.zmq_subscriber = new ZMQSubscriber()

		if (provider) {
			this.setupEventListeners()
		}
	}

	private setupEventListeners(): void {
		// 监听状态更新
		this.on("stateUpdate", (state: RobotArmState) => {
			this.provider.postMessageToWebview({
				type: "arm_controller_update",
				data: state,
			})
		})

		// 监听连接状态变化
		this.on("connectionStatusChanged", (status, error) => {
			this.provider.postMessageToWebview({
				type: "arm_connection_status",
				status,
				error,
			})
		})

		// 监听错误
		this.on("error", (error: Error) => {
			console.error("[ArmStateSubscriber] Error:", error.message)
			this.provider.postMessageToWebview({
				type: "arm_connection_status",
				status: "error",
				error: error.message,
			})
		})
	}

	async make_connection(): Promise<boolean> {
		try {
			const server_endpoint = `tcp://${this.currentConfig!.ipAddress}:${this.currentConfig!.port}`

			// 1. 连接到服务器获取端口信息
			console.log(`[ArmStateSubscriber] Connecting to server at ${server_endpoint}`)
			this.zmq_server.connect(server_endpoint)

			// 2. 发送获取信息请求
			await this.zmq_server.send("get_info")

			// 3. 接收服务器返回的端口信息 (二进制数据)
			const [response] = await this.zmq_server.receive()
			const net_infos = parseNetworkInfo(response)

			const dealer_endpoint = ipv4InfoToEndpoint(net_infos.dealer_info)
			const sub_endpoint = ipv4InfoToEndpoint(net_infos.sub_info)

			console.log(`[ArmStateSubscriber] dealer_info: ${dealer_endpoint}`)
			console.log(`[ArmStateSubscriber] sub_info: ${sub_endpoint}`)

			// 4. 连接到DEALER socket (用于发送命令)
			this.zmq_dealer.connect(dealer_endpoint)
			console.log(`[ArmStateSubscriber] Connected to dealer at ${dealer_endpoint}`)

			// 5. 连接到SUB socket (用于订阅状态)
			this.zmq_subscriber.connect(sub_endpoint)
			// 订阅所有消息 (空字符串表示订阅所有)
			this.zmq_subscriber.subscribe("")
			console.log(`[ArmStateSubscriber] Connected to subscriber at ${sub_endpoint}`)

			return true
		} catch (error) {
			console.error("[ArmStateSubscriber] Connection failed:", error)
			return false
		}
	}

	async connect(config?: Partial<ConnectionConfig>): Promise<void> {
		if (this.isConnecting || this.isConnected) {
			console.log("[ArmStateSubscriber] Already connecting or connected")
			return
		}

		// 更新配置
		if (config) {
			this.currentConfig = { ...this.currentConfig!, ...config }
		}

		try {
			console.log(
				`[ArmStateSubscriber] Connecting to robot arm at ${this.currentConfig!.ipAddress}:${this.currentConfig!.port}`,
			)

			this.isConnecting = true
			this.emit("connectionStatusChanged", "connecting")

			// 使用新的连接方法
			const connected = await this.make_connection()
			if (!connected) {
				throw new Error("Failed to establish ZMQ connections")
			}

			this.isConnected = true
			this.isConnecting = false
			this.emit("connected")
			this.emit("connectionStatusChanged", "connected")

			// 启动消息订阅循环
			this.startSubscriptionLoop()

			console.log(
				`[ArmStateSubscriber] Successfully connected to robot arm at ${this.currentConfig!.ipAddress}:${this.currentConfig!.port}`,
			)
		} catch (error) {
			this.isConnecting = false
			this.isConnected = false

			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error("[ArmStateSubscriber] Failed to connect:", errorMessage)

			this.emit("error", error instanceof Error ? error : new Error(errorMessage))
			this.emit("connectionStatusChanged", "error", errorMessage)
		}
	}

	private startSubscriptionLoop(): void {
		// 启动订阅循环，类似于C++中的subscribe_thread
		// 使用异步执行避免阻塞主线程
		this.runSubscriptionLoop().catch((error) => {
			if (this.isConnected) {
				console.error("[ArmStateSubscriber] Subscription loop error:", error)
				this.emit("error", error instanceof Error ? error : new Error(String(error)))
			}
		})
	}

	private async runSubscriptionLoop(): Promise<void> {
		const MESSAGE_TIMEOUT_MS = this.currentConfig?.messageTimeout || 10000 // 使用配置的超时时间
		const MAX_CONSECUTIVE_TIMEOUTS = this.currentConfig?.maxConsecutiveTimeouts || 3 // 使用配置的最大超时次数
		let consecutiveTimeouts = 0

		console.log(
			`[ArmStateSubscriber] Starting subscription loop with timeout: ${MESSAGE_TIMEOUT_MS}ms, max consecutive timeouts: ${MAX_CONSECUTIVE_TIMEOUTS}`,
		)

		try {
			// 使用异步迭代器，与 getRobotStateTool.ts 相同的模式
			const iterator = this.zmq_subscriber[Symbol.asyncIterator]()

			while (this.isConnected) {
				let timeoutId: NodeJS.Timeout | undefined

				// 创建超时Promise
				const timeoutPromise: Promise<never> = new Promise((_, reject) => {
					timeoutId = setTimeout(() => {
						reject(new Error(`Timeout after ${MESSAGE_TIMEOUT_MS}ms waiting for ZMQ message`))
					}, MESSAGE_TIMEOUT_MS)
				})

				try {
					// 使用异步迭代器的 next() 方法
					const messagePromise = iterator.next()

					// 使用Promise.race等待消息或超时
					const result = await Promise.race([messagePromise, timeoutPromise])

					// 清除超时定时器
					if (timeoutId) {
						clearTimeout(timeoutId)
						timeoutId = undefined
					}

					// 重置连续超时计数
					consecutiveTimeouts = 0

					if (!this.isConnected) {
						console.log("[ArmStateSubscriber] Subscription loop stopped by disconnect")
						break
					}

					// 检查迭代器是否结束
					if (result.done) {
						console.log("[ArmStateSubscriber] ZMQ subscriber closed")
						break
					}

					const [message] = result.value

					try {
						const data = ParseRobotStateData(message)
						// console.log(`[ArmStateSubscriber] Received state update: ${JSON.stringify(data)}`)
						this.emit("stateUpdate", data)
					} catch (parseError) {
						console.error("[ArmStateSubscriber] Failed to parse received message:", parseError)
					}
				} catch (error: any) {
					// 清除超时定时器
					if (timeoutId) {
						clearTimeout(timeoutId)
						timeoutId = undefined
					}

					if (!this.isConnected) {
						console.log("[ArmStateSubscriber] Subscription loop stopped by disconnect")
						break
					}

					// 检查是否为超时错误
					if (error.message && error.message.includes("Timeout")) {
						consecutiveTimeouts++
						console.warn(
							`[ArmStateSubscriber] Message receive timeout (${consecutiveTimeouts}/${MAX_CONSECUTIVE_TIMEOUTS}): ${error.message}`,
						)

						// 如果连续超时次数过多，触发错误事件
						if (consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
							const timeoutError = new Error(
								`Connection appears to be lost: ${MAX_CONSECUTIVE_TIMEOUTS} consecutive timeouts`,
							)
							console.error("[ArmStateSubscriber] Too many consecutive timeouts, connection may be lost")
							this.emit("error", timeoutError)
							this.emit("connectionStatusChanged", "error", timeoutError.message)
							break
						}
					} else {
						// 其他类型的错误
						console.error("[ArmStateSubscriber] Subscription loop error:", error)
						this.emit("error", error instanceof Error ? error : new Error(String(error)))
						break
					}
				}
			}
		} catch (error) {
			if (this.isConnected) {
				console.error("[ArmStateSubscriber] Subscription loop fatal error:", error)
				this.emit("error", error instanceof Error ? error : new Error(String(error)))
			}
		}

		console.log("[ArmStateSubscriber] Subscription loop ended")
	}

	async disconnect(): Promise<void> {
		console.log("[ArmStateSubscriber] Disconnecting...")

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = undefined
		}

		if (this.mockDataTimer) {
			clearInterval(this.mockDataTimer)
			this.mockDataTimer = undefined
		}

		// 关闭ZMQ连接
		try {
			// 设置断开连接标志，停止订阅循环
			this.isConnected = false
			this.isConnecting = false

			// 关闭所有ZMQ socket
			if (this.zmq_subscriber) {
				this.zmq_subscriber.close()
			}
			if (this.zmq_dealer) {
				this.zmq_dealer.close()
			}
			if (this.zmq_server) {
				this.zmq_server.close()
			}

			console.log("[ArmStateSubscriber] All ZMQ sockets closed")
		} catch (error) {
			console.error("[ArmStateSubscriber] Error closing ZMQ sockets:", error)
		}

		this.emit("disconnected")
		this.emit("connectionStatusChanged", "disconnected")
	}

	async reconnect(): Promise<void> {
		await this.disconnect()
		await this.connect()
	}

	// 机械臂控制命令处理
	async executeCommand(params: RobotArmControllerParams): Promise<ToolResponse> {
		const { command, data } = params

		try {
			switch (command) {
				case "connect":
					return await this.handleConnect(data)
				case "disconnect":
					return await this.handleDisconnect()
				case "reconnect":
					return await this.handleReconnect()
				case "enable":
					return await this.handleEnable()
				case "disable":
					return await this.handleDisable()
				case "home":
					return await this.handleHome(data)
				case "move_to_target":
					return await this.handleMoveToTarget(data)
				case "stop":
					return await this.handleStop()
				case "emergency_stop":
					return await this.handleEmergencyStop()
				case "reset":
					return await this.handleReset()
				case "save_home_position":
					return await this.handleSaveHomePosition(data)
				case "reset_home_position":
					return await this.handleResetHomePosition()
				default:
					return formatResponse.toolError(`Unknown command: ${command}`)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(`[ArmStateSubscriber] Command ${command} failed:`, errorMessage)
			return formatResponse.toolError(`Command ${command} failed: ${errorMessage}`)
		}
	}

	private async handleConnect(connectionData: any): Promise<ToolResponse> {
		if (!connectionData || !connectionData.ipAddress || !connectionData.port) {
			return formatResponse.toolError("Missing connection parameters (ipAddress, port)")
		}

		const config: Partial<ConnectionConfig> = {
			ipAddress: connectionData.ipAddress,
			port: connectionData.port,
			topic: connectionData.topic || "arm_state",
		}

		console.log(`[ArmStateSubscriber] Connecting to ${config.ipAddress}:${config.port}`)

		await this.connect(config)

		return formatResponse.toolResult(`Connecting to robot arm at ${config.ipAddress}:${config.port}`, [])
	}

	private async handleDisconnect(): Promise<ToolResponse> {
		console.log("[ArmStateSubscriber] Disconnecting from robot arm")

		await this.disconnect()

		return formatResponse.toolResult("Disconnected from robot arm", [])
	}

	private async handleReconnect(): Promise<ToolResponse> {
		console.log("[ArmStateSubscriber] Reconnecting to robot arm")

		await this.reconnect()

		return formatResponse.toolResult("Reconnecting to robot arm", [])
	}

	private async handleEnable(): Promise<ToolResponse> {
		if (!this.isConnected) {
			return formatResponse.toolError("Robot arm is not connected")
		}

		console.log("[ArmStateSubscriber] Enabling robot arm")

		// TODO: 发送启用命令到实际的机械臂
		// 这里应该通过 ZMQ 或其他通信方式发送命令

		return formatResponse.toolResult("Robot arm enabled", [])
	}

	private async handleDisable(): Promise<ToolResponse> {
		if (!this.isConnected) {
			return formatResponse.toolError("Robot arm is not connected")
		}

		console.log("[ArmStateSubscriber] Disabling robot arm")

		// TODO: 发送禁用命令到实际的机械臂

		return formatResponse.toolResult("Robot arm disabled", [])
	}

	private async handleHome(homePose: any): Promise<ToolResponse> {
		if (!this.isConnected) {
			return formatResponse.toolError("Robot arm is not connected")
		}

		console.log("[ArmStateSubscriber] Moving to home position:", homePose)

		// TODO: 发送回原点命令到实际的机械臂

		return formatResponse.toolResult(`Moving to home position: ${JSON.stringify(homePose)}`, [])
	}

	private async handleMoveToTarget(targetPose: any): Promise<ToolResponse> {
		if (!this.isConnected) {
			return formatResponse.toolError("Robot arm is not connected")
		}

		console.log("[ArmStateSubscriber] Moving to target position:", targetPose)

		// TODO: 发送移动命令到实际的机械臂

		return formatResponse.toolResult(`Moving to target position: ${JSON.stringify(targetPose)}`, [])
	}

	private async handleStop(): Promise<ToolResponse> {
		if (!this.isConnected) {
			return formatResponse.toolError("Robot arm is not connected")
		}

		console.log("[ArmStateSubscriber] Stopping robot arm")

		// TODO: 发送停止命令到实际的机械臂

		return formatResponse.toolResult("Robot arm stopped", [])
	}

	private async handleEmergencyStop(): Promise<ToolResponse> {
		console.log("[ArmStateSubscriber] Emergency stop activated")

		// TODO: 发送急停命令到实际的机械臂
		// 急停命令应该即使在未连接状态下也能尝试发送

		return formatResponse.toolResult("Emergency stop activated", [])
	}

	private async handleReset(): Promise<ToolResponse> {
		if (!this.isConnected) {
			return formatResponse.toolError("Robot arm is not connected")
		}

		console.log("[ArmStateSubscriber] Resetting robot arm")

		// TODO: 发送复位命令到实际的机械臂

		return formatResponse.toolResult("Robot arm reset", [])
	}

	private async handleSaveHomePosition(homePose: any): Promise<ToolResponse> {
		console.log("[ArmStateSubscriber] Saving home position:", homePose)

		// TODO: 保存Home位置到配置文件或发送到机械臂

		return formatResponse.toolResult(`Home position saved: ${JSON.stringify(homePose)}`, [])
	}

	private async handleResetHomePosition(): Promise<ToolResponse> {
		console.log("[ArmStateSubscriber] Resetting home position to default")

		// TODO: 重置Home位置到默认值

		const defaultHome = { x: 0, y: 0, z: 400, roll: 0, pitch: 0, yaw: 0 }
		return formatResponse.toolResult(`Home position reset to default: ${JSON.stringify(defaultHome)}`, [])
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) {
			return
		}

		console.log(`[ArmStateSubscriber] Scheduling reconnect in ${this.reconnectInterval}ms`)
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined
			this.connect()
		}, this.reconnectInterval)
	}

	get connected(): boolean {
		return this.isConnected
	}

	get connecting(): boolean {
		return this.isConnecting
	}

	get connectionConfig(): ConnectionConfig | undefined {
		return this.currentConfig ? { ...this.currentConfig } : undefined
	}

	// 更新连接配置（不会立即连接）
	updateConfig(config: Partial<ConnectionConfig>): void {
		if (this.currentConfig) {
			this.currentConfig = { ...this.currentConfig, ...config }
		}
	}

	// 获取当前连接状态
	getConnectionStatus(): {
		connected: boolean
		connecting: boolean
		config?: ConnectionConfig
	} {
		return {
			connected: this.isConnected,
			connecting: this.isConnecting,
			config: this.connectionConfig,
		}
	}

	// 清理资源
	async dispose(): Promise<void> {
		await this.disconnect()
		this.removeAllListeners()
	}
}

// TODO: 实际的 libzmq 实现示例
/*
import * as zmq from "zeromq"

export class RealArmStateSubscriber extends ArmStateSubscriber {
	private socket?: zmq.Subscriber

	async connect(config?: Partial<ConnectionConfig>): Promise<void> {
		if (this.isConnecting || this.isConnected) {
			return
		}

		if (config) {
			this.updateConfig(config)
		}

		const endpoint = `tcp://${this.currentConfig!.ipAddress}:${this.currentConfig!.port}`

		try {
			this.isConnecting = true
			this.emit("connectionStatusChanged", "connecting")

			this.socket = new zmq.Subscriber()
			this.socket.connect(endpoint)
			this.socket.subscribe(this.currentConfig!.topic || "arm_state")

			console.log(`[ArmStateSubscriber] Connected to ${endpoint}`)
			
			this.isConnected = true
			this.isConnecting = false
			this.emit("connected")
			this.emit("connectionStatusChanged", "connected")

			// 监听消息
			for await (const [topic, message] of this.socket) {
				if (!this.isConnected) break
				
				try {
					const data = JSON.parse(message.toString())
					this.emit("stateUpdate", data as RobotArmState)
				} catch (error) {
					console.error("[ArmStateSubscriber] Failed to parse message:", error)
				}
			}
		} catch (error) {
			this.isConnecting = false
			this.isConnected = false
			
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error("[ArmStateSubscriber] Connection failed:", errorMessage)
			
			this.emit("error", error instanceof Error ? error : new Error(errorMessage))
			this.emit("connectionStatusChanged", "error", errorMessage)
		}
	}

	async disconnect(): Promise<void> {
		if (this.socket) {
			this.socket.close()
			this.socket = undefined
		}
		
		this.isConnected = false
		this.isConnecting = false
		this.emit("disconnected")
		this.emit("connectionStatusChanged", "disconnected")
	}
}
*/
