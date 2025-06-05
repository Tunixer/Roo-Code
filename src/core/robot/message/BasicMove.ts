import { IRequestType, ICommandId, ICommandType } from "./Command"
import { RequestType, CommandId, CommandType } from "./Command"

export enum IBasicMoveType {
	kJointPosition = 0,
	kJointVelocity = 1,
	kJointTorques = 2,
	kCartesianPose = 3,
	kCartesianVelocity = 4,
	kOther = 5,
}

class BasicMoveType {
	static size = 1

	static fromDataView(data: DataView): IBasicMoveType {
		const type = data.getUint8(0)
		return type as IBasicMoveType
	}

	static writeToDataView(dataView: DataView, data: IBasicMoveType) {
		dataView.setUint8(0, data)
	}
}

export interface IJointPosition {
	joint_positions: number[]
}

export class JointPosition implements IJointPosition {
	static size = 48
	joint_positions: number[]
	constructor(data: number[]) {
		this.joint_positions = data
	}

	static fromDataView(data: DataView): IJointPosition {
		const isLittleEndian = true
		const double_size = 8
		const joint_positions = []
		for (let i = 0; i < 6; i++) {
			joint_positions.push(data.getFloat64(4 + i * double_size, isLittleEndian))
		}
		return { joint_positions }
	}

	static writeToDataView(dataView: DataView, data: IJointPosition) {
		const isLittleEndian = true
		const double_size = 8
		for (let i = 0; i < 6; i++) {
			dataView.setFloat64(4 + i * double_size, data.joint_positions[i], isLittleEndian)
		}
	}
}

export interface IJointVelocity {
	joint_velocities: number[]
}

export class JointVelocity implements IJointVelocity {
	static size = 48

	joint_velocities: number[]
	constructor(data: number[]) {
		this.joint_velocities = data
	}

	static fromDataView(data: DataView): IJointVelocity {
		const isLittleEndian = true
		const double_size = 8
		const joint_velocities = []
		for (let i = 0; i < 6; i++) {
			joint_velocities.push(data.getFloat64(4 + i * double_size, isLittleEndian))
		}
		return { joint_velocities }
	}

	static writeToDataView(dataView: DataView, data: IJointVelocity) {
		const isLittleEndian = true
		const double_size = 8
		for (let i = 0; i < 6; i++) {
			dataView.setFloat64(4 + i * double_size, data.joint_velocities[i], isLittleEndian)
		}
	}
}

export interface IJointTorques {
	torques: number[]
}

export class JointTorques implements IJointTorques {
	static size = 48

	torques: number[]
	constructor(data: number[]) {
		this.torques = data
	}

	static fromDataView(data: DataView): IJointTorques {
		const isLittleEndian = true
		const double_size = 8
		const torques = []
		for (let i = 0; i < 6; i++) {
			torques.push(data.getFloat64(4 + i * double_size, isLittleEndian))
		}
		return { torques }
	}

	static writeToDataView(dataView: DataView, data: IJointTorques) {
		const isLittleEndian = true
		const double_size = 8
		for (let i = 0; i < 6; i++) {
			dataView.setFloat64(4 + i * double_size, data.torques[i], isLittleEndian)
		}
	}
}

export interface ICartesianPose {
	position: number[]
	orientation: number[]
}

export class CartesianPose implements ICartesianPose {
	static size = 48

	position: number[]
	orientation: number[]
	constructor(data: number[]) {
		this.position = data.slice(0, 3)
		this.orientation = data.slice(3, 6)
	}

	static fromDataView(data: DataView): ICartesianPose {
		const isLittleEndian = true
		const double_size = 8
		const position = []
		const orientation = []
		position.push(data.getFloat64(0, isLittleEndian))
		position.push(data.getFloat64(double_size, isLittleEndian))
		position.push(data.getFloat64(2 * double_size, isLittleEndian))
		orientation.push(data.getFloat64(3 * double_size, isLittleEndian))
		orientation.push(data.getFloat64(4 * double_size, isLittleEndian))
		orientation.push(data.getFloat64(5 * double_size, isLittleEndian))
		return { position, orientation }
	}

	static writeToDataView(dataView: DataView, data: ICartesianPose) {
		const isLittleEndian = true
		const double_size = 8
		dataView.setFloat64(0, data.position[0], isLittleEndian)
		dataView.setFloat64(double_size, data.position[1], isLittleEndian)
		dataView.setFloat64(2 * double_size, data.position[2], isLittleEndian)
		dataView.setFloat64(3 * double_size, data.orientation[0], isLittleEndian)
		dataView.setFloat64(4 * double_size, data.orientation[1], isLittleEndian)
		dataView.setFloat64(5 * double_size, data.orientation[2], isLittleEndian)
	}
}

export interface ICartesianVelocity {
	linear_velocity: number[]
	angular_velocity: number[]
}

export class CartesianVelocity implements ICartesianVelocity {
	static size = 48

	linear_velocity: number[]
	angular_velocity: number[]
	constructor(data: number[]) {
		this.linear_velocity = data.slice(0, 3)
		this.angular_velocity = data.slice(3, 6)
	}
	static fromDataView(data: DataView): ICartesianVelocity {
		const isLittleEndian = true
		const double_size = 8
		const linear_velocity = []
		const angular_velocity = []
		linear_velocity.push(data.getFloat64(0, isLittleEndian))
		linear_velocity.push(data.getFloat64(double_size, isLittleEndian))
		linear_velocity.push(data.getFloat64(2 * double_size, isLittleEndian))
		angular_velocity.push(data.getFloat64(3 * double_size, isLittleEndian))
		angular_velocity.push(data.getFloat64(4 * double_size, isLittleEndian))
		angular_velocity.push(data.getFloat64(5 * double_size, isLittleEndian))
		return { linear_velocity, angular_velocity }
	}

	static writeToDataView(dataView: DataView, data: ICartesianVelocity) {
		const isLittleEndian = true
		const double_size = 8
		dataView.setFloat64(0, data.linear_velocity[0], isLittleEndian)
		dataView.setFloat64(double_size, data.linear_velocity[1], isLittleEndian)
		dataView.setFloat64(2 * double_size, data.linear_velocity[2], isLittleEndian)
		dataView.setFloat64(3 * double_size, data.angular_velocity[0], isLittleEndian)
		dataView.setFloat64(4 * double_size, data.angular_velocity[1], isLittleEndian)
		dataView.setFloat64(5 * double_size, data.angular_velocity[2], isLittleEndian)
	}
}

export interface IBasicMoveReq {
	request_type: IRequestType
	command_id: ICommandId
	command_type: ICommandType
	move_type: IBasicMoveType
	move_target: IJointPosition | IJointVelocity | IJointTorques | ICartesianPose | ICartesianVelocity
}

export class BasicMoveReq implements IBasicMoveReq {
	static size =
		RequestType.size +
		CommandId.size +
		CommandType.size +
		BasicMoveType.size +
		JointPosition.size +
		JointVelocity.size +
		JointTorques.size +
		CartesianPose.size +
		CartesianVelocity.size
	request_type: IRequestType
	command_id: ICommandId
	command_type: ICommandType
	move_type: IBasicMoveType
	move_target: IJointPosition | IJointVelocity | IJointTorques | ICartesianPose | ICartesianVelocity

	constructor(data: IBasicMoveReq) {
		this.request_type = data.request_type
		this.command_id = data.command_id
		this.command_type = data.command_type
		this.move_type = data.move_type
		this.move_target = data.move_target
	}
	static toArrayBuffer(data: IBasicMoveReq): ArrayBuffer {
		let ret = new ArrayBuffer(BasicMoveReq.size)
		let currentOffset = 0
		const viewRequestType = new DataView(ret, currentOffset)
		RequestType.writeToDataView(viewRequestType, data.request_type)
		currentOffset += RequestType.size
		const viewCommandId = new DataView(ret, currentOffset)
		CommandId.writeToDataView(viewCommandId, data.command_id)
		currentOffset += CommandId.size
		const viewCommandType = new DataView(ret, currentOffset)
		CommandType.writeToDataView(viewCommandType, data.command_type)
		currentOffset += CommandType.size
		const viewBasicMoveType = new DataView(ret, currentOffset)
		BasicMoveType.writeToDataView(viewBasicMoveType, data.move_type)
		currentOffset += BasicMoveType.size
		switch (data.move_type) {
			case IBasicMoveType.kJointPosition:
				const viewJointPosition = new DataView(ret, currentOffset)
				JointPosition.writeToDataView(viewJointPosition, data.move_target as IJointPosition)
				currentOffset += JointPosition.size
				break
			case IBasicMoveType.kJointVelocity:
				const viewJointVelocity = new DataView(ret, currentOffset)
				JointVelocity.writeToDataView(viewJointVelocity, data.move_target as IJointVelocity)
				currentOffset += JointVelocity.size
				break
			case IBasicMoveType.kJointTorques:
				const viewJointTorques = new DataView(ret, currentOffset)
				JointTorques.writeToDataView(viewJointTorques, data.move_target as IJointTorques)
				currentOffset += JointTorques.size
				break
			case IBasicMoveType.kCartesianPose:
				const viewCartesianPose = new DataView(ret, currentOffset)
				CartesianPose.writeToDataView(viewCartesianPose, data.move_target as ICartesianPose)
				currentOffset += CartesianPose.size
				break
			case IBasicMoveType.kCartesianVelocity:
				const viewCartesianVelocity = new DataView(ret, currentOffset)
				CartesianVelocity.writeToDataView(viewCartesianVelocity, data.move_target as ICartesianVelocity)
				currentOffset += CartesianVelocity.size
				break
			default:
				throw new Error("Invalid move type")
		}
		return ret
	}
}
