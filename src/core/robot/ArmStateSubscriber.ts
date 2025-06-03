import { EventEmitter } from "events"
import { RobotArmState } from "./types"
import { ToolResponse } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"

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

	constructor(
		provider?: any,
		private readonly defaultConfig: ConnectionConfig = {
			ipAddress: "localhost",
			port: 5555,
			topic: "arm_state",
		},
	) {
		super()
		this.currentConfig = { ...defaultConfig }
		this.provider = provider

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

	async connect(config?: Partial<ConnectionConfig>): Promise<void> {
		if (this.isConnecting || this.isConnected) {
			console.log("[ArmStateSubscriber] Already connecting or connected")
			return
		}

		// 更新配置
		if (config) {
			this.currentConfig = { ...this.currentConfig!, ...config }
		}

		const endpoint = `tcp://${this.currentConfig!.ipAddress}:${this.currentConfig!.port}`

		try {
			console.log(`[ArmStateSubscriber] Connecting to ${endpoint} for topic ${this.currentConfig!.topic}`)

			this.isConnecting = true
			this.emit("connectionStatusChanged", "connecting")

			// TODO: 实际的 libzmq 连接逻辑
			// 这里需要根据你的具体 libzmq 库来实现
			// 例如使用 zeromq 或其他 ZMQ 库

			// 模拟连接延迟
			await new Promise((resolve) => setTimeout(resolve, 1000))

			// 模拟连接成功/失败
			const shouldSucceed = Math.random() > 0.2 // 80% 成功率

			if (!shouldSucceed) {
				throw new Error("Connection timeout or refused")
			}

			this.isConnected = true
			this.isConnecting = false
			this.emit("connected")
			this.emit("connectionStatusChanged", "connected")

			// 启动模拟数据发送（实际实现中应该是真实的 ZMQ 订阅）
			this.startMockDataStream()

			console.log(`[ArmStateSubscriber] Successfully connected to ${endpoint}`)
		} catch (error) {
			this.isConnecting = false
			this.isConnected = false

			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error("[ArmStateSubscriber] Failed to connect:", errorMessage)

			this.emit("error", error instanceof Error ? error : new Error(errorMessage))
			this.emit("connectionStatusChanged", "error", errorMessage)

			// 不自动重连，让用户手动重试
		}
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

		// TODO: 实际的 libzmq 断开连接逻辑

		this.isConnected = false
		this.isConnecting = false
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

	private startMockDataStream(): void {
		// 清除之前的定时器
		if (this.mockDataTimer) {
			clearInterval(this.mockDataTimer)
		}

		// 模拟数据流 - 实际实现中应该替换为真实的 ZMQ 消息处理
		this.mockDataTimer = setInterval(() => {
			if (!this.isConnected) {
				if (this.mockDataTimer) {
					clearInterval(this.mockDataTimer)
					this.mockDataTimer = undefined
				}
				return
			}

			const mockState: RobotArmState = {
				connected: true,
				enabled: Math.random() > 0.1, // 90% 概率启用
				moving: Math.random() > 0.7, // 30% 概率在运动
				error: Math.random() > 0.95 ? "模拟错误" : null, // 5% 概率有错误
				currentPose: {
					x: 150 + (Math.random() - 0.5) * 20,
					y: -200 + (Math.random() - 0.5) * 20,
					z: 350 + (Math.random() - 0.5) * 20,
					roll: 15 + (Math.random() - 0.5) * 10,
					pitch: -5 + (Math.random() - 0.5) * 10,
					yaw: 90 + (Math.random() - 0.5) * 10,
				},
				jointPositions: Array.from({ length: 6 }, () => (Math.random() - 0.5) * 180),
				jointVelocities: Array.from({ length: 6 }, () => (Math.random() - 0.5) * 2),
				jointTorques: Array.from({ length: 6 }, () => (Math.random() - 0.5) * 10),
			}

			this.emit("stateUpdate", mockState)
		}, 1000) // 每秒更新一次
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
