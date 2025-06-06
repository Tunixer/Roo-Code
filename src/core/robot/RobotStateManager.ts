import { EventEmitter } from "events"
import { ArmStateSubscriber } from "./ArmStateSubscriber"
import { RobotArmState, RobotCommandMessage } from "./types"

export interface RobotStateManagerEvents {
	stateUpdate: [state: RobotArmState]
	error: [error: Error]
}

export class RobotStateManager extends EventEmitter<RobotStateManagerEvents> {
	private armSubscriber: ArmStateSubscriber
	private currentState?: RobotArmState
	private isInitialized = false

	constructor(private readonly provider: any) {
		super()
		this.armSubscriber = new ArmStateSubscriber(provider)
		this.setupSubscriberListeners()
	}

	private setupSubscriberListeners(): void {
		this.armSubscriber.on("stateUpdate", (state: RobotArmState) => {
			this.currentState = state
			this.emit("stateUpdate", state)
		})

		this.armSubscriber.on("error", (error: Error) => {
			console.error("[RobotStateManager] Arm subscriber error:", error)
			this.emit("error", error)
		})

		this.armSubscriber.on("connected", () => {
			console.log("[RobotStateManager] Arm subscriber connected")
		})

		this.armSubscriber.on("disconnected", () => {
			console.log("[RobotStateManager] Arm subscriber disconnected")
		})
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return
		}

		try {
			console.log("[RobotStateManager] Initializing robot state manager")
			this.isInitialized = true
			console.log("[RobotStateManager] Robot state manager initialized successfully")
		} catch (error) {
			console.error("[RobotStateManager] Failed to initialize:", error)
			this.emit("error", error instanceof Error ? error : new Error(String(error)))
			throw error
		}
	}

	async dispose(): Promise<void> {
		console.log("[RobotStateManager] Disposing robot state manager")

		try {
			await this.armSubscriber.dispose()
			this.removeAllListeners()
			this.isInitialized = false
			console.log("[RobotStateManager] Robot state manager disposed")
		} catch (error) {
			console.error("[RobotStateManager] Error during disposal:", error)
		}
	}

	async handleCommand(message: RobotCommandMessage): Promise<void> {
		const { command, data } = message

		console.log(`[RobotStateManager] Handling command: ${command}`, data)

		try {
			// 使用 ArmStateSubscriber 的 executeCommand 方法来处理命令
			const result = await this.armSubscriber.executeCommand({ command, data })

			// 如果需要，可以处理工具的返回结果
			if (typeof result === "string" && result.includes("Error")) {
				console.error(`[RobotStateManager] Command ${command} failed:`, result)
				this.emit("error", new Error(result))
			} else {
				console.log(`[RobotStateManager] Command ${command} executed successfully:`, result)
			}
		} catch (error) {
			console.error(`[RobotStateManager] Error executing command ${command}:`, error)
			this.emit("error", error instanceof Error ? error : new Error(String(error)))
		}
	}

	// 获取当前连接状态
	getConnectionStatus(): {
		connected: boolean
		connecting: boolean
		config?: any
	} {
		return this.armSubscriber.getConnectionStatus()
	}

	// 获取当前状态
	getCurrentState(): RobotArmState | undefined {
		return this.currentState
	}

	// 检查是否已连接
	isConnected(): boolean {
		return this.armSubscriber.connected
	}

	// 检查是否正在连接
	isConnecting(): boolean {
		return this.armSubscriber.connecting
	}

	// 检查是否已初始化
	get initialized(): boolean {
		return this.isInitialized
	}
}
