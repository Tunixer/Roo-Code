import { Cline } from "../Cline"
import { PushToolResult, ToolUse, RemoveClosingTag, ToolDescription } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"
import Anthropic from "@anthropic-ai/sdk"
export interface RobotStateData {
	jointPositions: number[]
	jointVelocities: number[]
	endEffectorPose: {
		x: number
		y: number
		z: number
		roll: number
		pitch: number
		yaw: number
	}
	endEffectorVelocity: {
		vx: number
		vy: number
		vz: number
		wx: number
		wy: number
		wz: number
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
