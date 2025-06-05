// 机器人相关的共享类型定义
// 这个文件包含前后端都会使用的机器人数据结构

/**
 * 6轴机器人关节数据
 */
export interface JointData {
	position: number // 关节位置 (度或弧度)
	velocity: number // 关节速度
}

// 角度制和弧度制的枚举值
export enum AngleUnit {
	Degree,
	Radian,
}

/**
 * 3D位置和姿态
 */
export interface Pose {
	angle_unit: AngleUnit
	x: number // X坐标
	y: number // Y坐标
	z: number // Z坐标
	roll: number // 滚转角
	pitch: number // 俯仰角
	yaw: number // 偏航角
}

export interface PoseRad {
	x: number // 米
	y: number // 米
	z: number // 米
	roll: number // 弧度
	pitch: number // 弧度
	yaw: number // 弧度
}

export interface PoseDeg {
	x: number // 毫米
	y: number // 毫米
	z: number // 毫米
	roll: number // 度
	pitch: number // 度
	yaw: number // 度
}

/**
 * 速度信息
 */
export interface Velocity {
	linear: {
		x: number
		y: number
		z: number
	}
	angular: {
		roll: number
		pitch: number
		yaw: number
	}
}

/**
 * R6机器人完整状态数据
 */
export interface R6ArmState {
	// 6个关节的数据
	joints: [JointData, JointData, JointData, JointData, JointData, JointData]

	// 末端执行器位姿
	endEffectorPose: Pose

	// 末端执行器速度
	endEffectorVelocity: Velocity

	// 时间戳
	timestamp: number

	// 机器人状态
	status: "idle" | "moving" | "error" | "emergency_stop"

	// 可选的错误信息
	errorMessage?: string
}

/**
 * 机器人控制命令
 */
export interface RobotCommand {
	type: "move_joints" | "move_pose" | "stop" | "home" | "get_state"
	data?: any
	timestamp: number
}

/**
 * 机器人状态更新消息的载荷
 */
export interface RobotStateUpdatePayload {
	armState: R6ArmState
}

/**
 * 机器人错误消息的载荷
 */
export interface RobotErrorPayload {
	error: string
	code?: number
	timestamp: number
}
