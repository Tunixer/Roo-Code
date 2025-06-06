export interface ICommandId {
	cid: number
}

export class CommandId implements ICommandId {
	static size = 4
	cid: number

	constructor(cid: number) {
		this.cid = cid
	}

	static fromDataView(data: DataView): ICommandId {
		const isLittleEndian = true
		return { cid: data.getUint32(0, isLittleEndian) }
	}

	static writeToDataView(dataView: DataView, data: ICommandId) {
		const isLittleEndian = true
		dataView.setUint32(0, data.cid, isLittleEndian)
	}
}

export enum ICommandType {
	kTestMessage = 0,
	kBasicMove = 1,
	kArmStateMsg = 2,
	kBasicSyncWait = 3,
	kBasicResponse = 4,
	kControlMode = 5,
	kSetEndEffectorLoadWeight = 6,
	kSetEndEffectorLoadPose = 7,
	kSetStopExecution = 8,
	kSetCollisionDetection = 9,
	kUnknown = 10,
}

export class CommandType {
	static size = 2

	static fromDataView(data: DataView): ICommandType {
		const isLittleEndian = true
		const type = data.getUint16(0, isLittleEndian)
		return type as ICommandType
	}

	static writeToDataView(dataView: DataView, data: ICommandType) {
		const isLittleEndian = true
		dataView.setUint16(0, data, isLittleEndian)
	}
}

export enum IRequestType {
	kCallback = 0,
	kNonCallback = 1,
}

export class RequestType {
	static size = 1

	static fromDataView(data: DataView): IRequestType {
		const type = data.getUint8(0)
		return type as IRequestType
	}

	static writeToDataView(dataView: DataView, data: IRequestType) {
		dataView.setUint8(0, data as number)
	}
}
