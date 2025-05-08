import { Cline } from "../Cline"
import { PushToolResult, ToolUse, RemoveClosingTag, ToolDescription } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"
import Anthropic from "@anthropic-ai/sdk"
import { Subscriber, Message } from "zeromq"
export interface RobotStateData {
	joint_position: number[]
	joint_velocity: number[]
	joint_torques: number[]
	cartesian_pose: {
		x: number
		y: number
		z: number
		roll: number
		pitch: number
		yaw: number
	}
	cartesian_velocity: {
		vx: number
		vy: number
		vz: number
		wx: number
		wy: number
		wz: number
	}
}

function ParseRobotStateData(msg: Message): RobotStateData {
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
	return robotStateData
}

class RobotStateForwarder {
	private subscriber: Subscriber
	private cline: Cline
	constructor(cline: Cline) {
		this.subscriber = new Subscriber()
		this.cline = cline
	}
	async run() {
		this.subscriber.connect("tcp://localhost:5557")
		this.subscriber.subscribe()
		let count = 0
		const MAX_MSG_COUNT = 1000
		for await (const [msg] of this.subscriber) {
			if (msg) {
				const msg_data = ParseRobotStateData(msg)
				this.cline.providerRef.deref()?.postMessageToWebview({
					type: "r6arm_state_update",
					payload: msg_data,
				})
				console.log("received a message:", msg_data)
				count++
				if (count > MAX_MSG_COUNT) {
					break
				}
			} else {
				console.log("received a invalid message:", msg)
			}
		}
	}
}

export async function getRobotStateTool(
	cline: Cline,
	block: ToolUse,
	pushToolResult: PushToolResult,
	_removeClosingTag: RemoveClosingTag,
	toolDescription: ToolDescription,
) {
	if (block.name !== "robot_arm_state") {
		return
	}
	const result_text = "The robot arm state is shown above."
	await cline.say("robot_arm_state", result_text)
	// await cline.say("completion_result", result_text, undefined, false)
	// await cline.ask("completion_result", "", false)
	const forwarder = new RobotStateForwarder(cline)
	await forwarder.run()
	await cline.say("completion_result", result_text, undefined, false)
	cline.emit("taskCompleted", cline.taskId, cline.getTokenUsage(), cline.getToolUsage())

	const { response, text, images } = await cline.ask("completion_result", "", false)

	if (response === "yesButtonClicked") {
		pushToolResult("")
		return
	}

	await cline.say("user_feedback", text ?? "", images)
	const toolResults: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] = []

	toolResults.push({
		type: "text",
		text: `The user has provided feedback on the results. Consider their input to continue the task, and then attempt completion again.\n<feedback>\n${text}\n</feedback>`,
	})

	toolResults.push(...formatResponse.imageBlocks(images))
	cline.userMessageContent.push({ type: "text", text: `${toolDescription()} Result:` })
	cline.userMessageContent.push(...toolResults)
	// TODO 使用toolDescription() 还是直接pushToolResult(toolResults)
	// pushToolResult(toolResults)
	return
}
