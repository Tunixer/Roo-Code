import { PoseDeg } from "../../shared/robot-types"
export interface RobotArmState {
	// 连接状态
	connected: boolean
	enabled: boolean
	moving: boolean
	error: string | null

	// 当前位置和姿态
	currentPose: PoseDeg

	// 关节状态
	jointPositions: number[] // 单位：度
	jointVelocities: number[] // 单位：度/秒
	jointTorques: number[] // 单位：N·m
}

export interface RobotCommand {
	command: string
	data?: any
}

export interface RobotStateUpdate {
	type: "arm_controller_update"
	data: RobotArmState
}

export interface RobotCommandMessage {
	type: "arm_controller_command"
	command: string
	data?: any
}
