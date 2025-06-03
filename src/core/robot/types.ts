export interface RobotPose {
	x: number // 毫米
	y: number // 毫米
	z: number // 毫米
	roll: number // 度
	pitch: number // 度
	yaw: number // 度
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
