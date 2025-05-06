import { Cline } from "../Cline"
import { PushToolResult, ToolUse } from "../../shared/tools"

export async function getRobotStateTool(cline: Cline, block: ToolUse, pushToolResult: PushToolResult) {
	if (block.name !== "robot_arm_state") {
		return
	}
	await cline.say("robot_arm_state", "The robot arm is in the up position.")
	pushToolResult("The robot arm is in the up position.")
	return
}
