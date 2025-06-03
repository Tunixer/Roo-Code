export interface RobotPose {
	x: number
	y: number
	z: number
	roll: number
	pitch: number
	yaw: number
}

export interface RobotArmState {
	// 连接状态
	connected: boolean
	enabled: boolean
	moving: boolean
	error: string | null

	// 当前位置和姿态
	currentPose: RobotPose

	// 关节状态
	jointPositions: number[]
	jointVelocities: number[]
	jointTorques: number[]
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
