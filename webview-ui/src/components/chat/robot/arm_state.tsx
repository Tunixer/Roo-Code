import React, { useState, useEffect, useCallback } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"

export const CytoR6ArmState: React.FC = () => {
	const { t } = useAppTranslation()

	const [jointPosition, setJointPosition] = useState<number[]>([0, 0, 0, 0, 0, 0])
	const [jointVelocity, setJointVelocity] = useState<number[]>([0, 0, 0, 0, 0, 0])
	const [jointTorques, setJointTorques] = useState<number[]>([0, 0, 0, 0, 0, 0])
	const [endEffectorPose, setEndEffectorPose] = useState<{
		x: number
		y: number
		z: number
		roll: number
		pitch: number
		yaw: number
	}>({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 })
	const [endEffectorVelocity, setEndEffectorVelocity] = useState<{
		vx: number
		vy: number
		vz: number
		wx: number
		wy: number
		wz: number
	}>({ vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 })

	const handleMessages = useCallback(
		(event: MessageEvent) => {
			const message = event.data
			console.log("Received message in arm_state:", message)

			if (message.type === "r6arm_state_update" && message.payload) {
				const robotStateData = message.payload

				if (robotStateData.joint_position) {
					setJointPosition(robotStateData.joint_position)
				}
				if (robotStateData.joint_velocity) {
					setJointVelocity(robotStateData.joint_velocity)
				}
				if (robotStateData.joint_torques) {
					setJointTorques(robotStateData.joint_torques)
				}
				if (robotStateData.cartesian_pose) {
					setEndEffectorPose(robotStateData.cartesian_pose)
				}
				if (robotStateData.cartesian_velocity) {
					setEndEffectorVelocity(robotStateData.cartesian_velocity)
				}
			}
		},
		[setJointPosition, setJointVelocity, setJointTorques, setEndEffectorPose, setEndEffectorVelocity],
	)

	useEffect(() => {
		window.addEventListener("message", handleMessages)

		return () => {
			window.removeEventListener("message", handleMessages)
		}
	}, [handleMessages])

	return (
		<div className="flex flex-col px-4 py-2 mb-2 text-sm rounded bg-vscode-sideBar-background text-vscode-foreground">
			<div className="font-bold mb-2">{t("robot:armState.title")}</div>

			<div className="mb-2">
				<div className="font-semibold mb-1">{t("robot:armState.jointState")}</div>
				<div className="grid grid-cols-2 gap-x-4 gap-y-1">
					{jointPosition.map((pos, index) => (
						<div key={`jp-${index}`}>
							{t("robot:armState.jointPosition", { number: index + 1 })}: {pos.toFixed(2)}
						</div>
					))}
					{jointVelocity.map((vel, index) => (
						<div key={`jv-${index}`}>
							{t("robot:armState.jointVelocity", { number: index + 1 })}: {vel.toFixed(2)}
						</div>
					))}
					{jointTorques.map((torque, index) => (
						<div key={`jt-${index}`}>
							{t("robot:armState.jointTorque", { number: index + 1 })}: {torque.toFixed(2)}
						</div>
					))}
				</div>
			</div>

			<div>
				<div className="font-semibold mb-1">{t("robot:armState.endEffectorState")}</div>
				<div className="grid grid-cols-2 gap-x-4 gap-y-1">
					<div>
						{t("robot:armState.posePosition")}: X: {endEffectorPose.x.toFixed(2)}, Y:{" "}
						{endEffectorPose.y.toFixed(2)}, Z:{endEffectorPose.z.toFixed(2)}
					</div>
					<div>
						{t("robot:armState.poseOrientation")}: R: {endEffectorPose.roll.toFixed(2)}, P:{" "}
						{endEffectorPose.pitch.toFixed(2)}, Y: {endEffectorPose.yaw.toFixed(2)}
					</div>
					<div>
						{t("robot:armState.velocityLinear")}: Vx: {endEffectorVelocity.vx.toFixed(2)}, Vy:{" "}
						{endEffectorVelocity.vy.toFixed(2)}, Vz: {endEffectorVelocity.vz.toFixed(2)}
					</div>
					<div>
						{t("robot:armState.velocityAngular")}: Wx: {endEffectorVelocity.wx.toFixed(2)}, Wy:{" "}
						{endEffectorVelocity.wy.toFixed(2)}, Wz: {endEffectorVelocity.wz.toFixed(2)}
					</div>
				</div>
			</div>
		</div>
	)
}
