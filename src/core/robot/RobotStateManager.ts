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

	constructor(
		private readonly provider: any, // ClineProvider instance
		private readonly zmqEndpoint?: string,
		private readonly topic?: string,
	) {
		super()

		this.armSubscriber = new ArmStateSubscriber(zmqEndpoint, topic)
		this.setupSubscriberListeners()
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return
		}

		try {
			console.log("[RobotStateManager] Initializing robot state manager")
			await this.armSubscriber.start()
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
			await this.armSubscriber.stop()
			this.removeAllListeners()
			this.isInitialized = false
			console.log("[RobotStateManager] Robot state manager disposed")
		} catch (error) {
			console.error("[RobotStateManager] Error during disposal:", error)
		}
	}

	private setupSubscriberListeners(): void {
		this.armSubscriber.on("stateUpdate", (state: RobotArmState) => {
			this.currentState = state
			this.emit("stateUpdate", state)

			// 发送状态更新到 webview
			this.provider
				.postMessageToWebview({
					type: "robotStateUpdate",
					data: {
						type: "arm_controller_update",
						data: state,
					},
				})
				.catch((error: Error) => {
					console.error("[RobotStateManager] Failed to send state update to webview:", error)
				})
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

	async handleCommand(message: RobotCommandMessage): Promise<void> {
		const { command, data } = message

		console.log(`[RobotStateManager] Handling command: ${command}`, data)

		try {
			switch (command) {
				case "enable":
					await this.enableArm()
					break
				case "disable":
					await this.disableArm()
					break
				case "home":
					await this.moveToHome(data)
					break
				case "move_to_target":
					await this.moveToTarget(data)
					break
				case "stop":
					await this.stopMovement()
					break
				case "emergency_stop":
					await this.emergencyStop()
					break
				case "reset":
					await this.resetArm()
					break
				case "save_home_position":
					await this.saveHomePosition(data)
					break
				case "reset_home_position":
					await this.resetHomePosition()
					break
				default:
					console.warn(`[RobotStateManager] Unknown command: ${command}`)
			}
		} catch (error) {
			console.error(`[RobotStateManager] Error executing command ${command}:`, error)
			this.emit("error", error instanceof Error ? error : new Error(String(error)))
		}
	}

	// 机器人控制命令实现
	private async enableArm(): Promise<void> {
		console.log("[RobotStateManager] Enabling arm")
		// TODO: 实际的机器人启用逻辑
		// 例如发送 ZMQ 命令到机器人控制器
	}

	private async disableArm(): Promise<void> {
		console.log("[RobotStateManager] Disabling arm")
		// TODO: 实际的机器人禁用逻辑
	}

	private async moveToHome(homePosition?: any): Promise<void> {
		console.log("[RobotStateManager] Moving to home position", homePosition)
		// TODO: 实际的回到原点逻辑
	}

	private async moveToTarget(targetPosition: any): Promise<void> {
		console.log("[RobotStateManager] Moving to target position", targetPosition)
		// TODO: 实际的移动到目标位置逻辑
	}

	private async stopMovement(): Promise<void> {
		console.log("[RobotStateManager] Stopping movement")
		// TODO: 实际的停止运动逻辑
	}

	private async emergencyStop(): Promise<void> {
		console.log("[RobotStateManager] Emergency stop")
		// TODO: 实际的急停逻辑
	}

	private async resetArm(): Promise<void> {
		console.log("[RobotStateManager] Resetting arm")
		// TODO: 实际的重置逻辑
	}

	private async saveHomePosition(position: any): Promise<void> {
		console.log("[RobotStateManager] Saving home position", position)
		// TODO: 实际的保存原点位置逻辑
	}

	private async resetHomePosition(): Promise<void> {
		console.log("[RobotStateManager] Resetting home position")
		// TODO: 实际的重置原点位置逻辑
	}

	// 获取当前状态
	getCurrentState(): RobotArmState | undefined {
		return this.currentState
	}

	// 检查是否已连接
	isConnected(): boolean {
		return this.armSubscriber.connected
	}

	// 检查是否已初始化
	get initialized(): boolean {
		return this.isInitialized
	}
}
