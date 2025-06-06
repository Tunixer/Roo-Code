import { Message } from "zeromq"
import { RobotArmState } from "../types"
import { PoseRad } from "../../../shared/robot-types"

export interface RobotStateData {
	joint_position: number[]
	joint_velocity: number[]
	joint_torques: number[]
	cartesian_pose: PoseRad
	cartesian_velocity: {
		vx: number
		vy: number
		vz: number
		wx: number
		wy: number
		wz: number
	}
}

export function ParseRobotStateData(msg: Message): RobotArmState {
	const view = new DataView(msg.buffer)
	const robotStateData: RobotStateData = {
		joint_position: [],
		joint_velocity: [],
		joint_torques: [],
		cartesian_pose: {
			x: 0,
			y: 0,
			z: 0,
			roll: 0,
			pitch: 0,
			yaw: 0,
		},
		cartesian_velocity: {
			vx: 0,
			vy: 0,
			vz: 0,
			wx: 0,
			wy: 0,
			wz: 0,
		},
	}
	const start_offset = 7
	const isLittleEndian = true
	const double_size = 8
	// parse joint positions
	for (let i = 0; i < 6; i++) {
		robotStateData.joint_position.push(view.getFloat64(start_offset + i * double_size, isLittleEndian))
	}
	// parse joint velocities
	const joint_velocities_offset = start_offset + 6 * double_size
	for (let i = 0; i < 6; i++) {
		robotStateData.joint_velocity.push(view.getFloat64(joint_velocities_offset + i * double_size, isLittleEndian))
	}

	// parse joint torques
	const joint_torques_offset = joint_velocities_offset + 6 * double_size
	for (let i = 0; i < 6; i++) {
		robotStateData.joint_torques.push(view.getFloat64(joint_torques_offset + i * double_size, isLittleEndian))
	}
	// parse end effector pose
	const end_effector_pose_offset = joint_torques_offset + 6 * double_size
	robotStateData.cartesian_pose.x = view.getFloat64(end_effector_pose_offset, isLittleEndian)
	robotStateData.cartesian_pose.y = view.getFloat64(end_effector_pose_offset + double_size, isLittleEndian)
	robotStateData.cartesian_pose.z = view.getFloat64(end_effector_pose_offset + 2 * double_size, isLittleEndian)
	robotStateData.cartesian_pose.roll = view.getFloat64(end_effector_pose_offset + 3 * double_size, isLittleEndian)
	robotStateData.cartesian_pose.pitch = view.getFloat64(end_effector_pose_offset + 4 * double_size, isLittleEndian)
	robotStateData.cartesian_pose.yaw = view.getFloat64(end_effector_pose_offset + 5 * double_size, isLittleEndian)
	// parse end effector velocity
	const end_effector_velocity_offset = end_effector_pose_offset + 6 * double_size
	robotStateData.cartesian_velocity.vx = view.getFloat64(end_effector_velocity_offset, isLittleEndian)
	robotStateData.cartesian_velocity.vy = view.getFloat64(end_effector_velocity_offset + double_size, isLittleEndian)
	robotStateData.cartesian_velocity.vz = view.getFloat64(
		end_effector_velocity_offset + 2 * double_size,
		isLittleEndian,
	)
	robotStateData.cartesian_velocity.wx = view.getFloat64(
		end_effector_velocity_offset + 3 * double_size,
		isLittleEndian,
	)
	robotStateData.cartesian_velocity.wy = view.getFloat64(
		end_effector_velocity_offset + 4 * double_size,
		isLittleEndian,
	)
	robotStateData.cartesian_velocity.wz = view.getFloat64(
		end_effector_velocity_offset + 5 * double_size,
		isLittleEndian,
	)
	return convertToRobotArmState(robotStateData)
}

// 将 RobotStateData 转换为 RobotArmState
function convertToRobotArmState(data: RobotStateData): RobotArmState {
	// 根据关节速度和末端执行器速度判断是否在运动
	const isMoving =
		data.joint_velocity.some((vel) => Math.abs(vel) > 0.001) ||
		Math.abs(data.cartesian_velocity.vx) > 0.001 ||
		Math.abs(data.cartesian_velocity.vy) > 0.001 ||
		Math.abs(data.cartesian_velocity.vz) > 0.001 ||
		Math.abs(data.cartesian_velocity.wx) > 0.001 ||
		Math.abs(data.cartesian_velocity.wy) > 0.001 ||
		Math.abs(data.cartesian_velocity.wz) > 0.001

	return {
		// 连接状态 - 能接收到消息说明已连接
		connected: true,
		enabled: true, // 假设启用状态，实际可能需要从其他地方获取
		moving: isMoving,
		error: null,

		// 当前位置和姿态 - 映射 cartesian_pose 到 currentPose
		currentPose: {
			x: data.cartesian_pose.x * 1000,
			y: data.cartesian_pose.y * 1000,
			z: data.cartesian_pose.z * 1000,
			roll: (data.cartesian_pose.roll * 180) / Math.PI,
			pitch: (data.cartesian_pose.pitch * 180) / Math.PI,
			yaw: (data.cartesian_pose.yaw * 180) / Math.PI,
		},

		// 关节状态 - 映射字段名
		jointPositions: data.joint_position.map((pos) => (pos * 180) / Math.PI),
		jointVelocities: data.joint_velocity.map((vel) => (vel * 180) / Math.PI),
		jointTorques: data.joint_torques,
	}
}
