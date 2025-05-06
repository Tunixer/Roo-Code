import React, { useState } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"

export const CytoR6ArmState: React.FC = () => {
	const { t } = useAppTranslation()

	const [jointPositions, _setJointPositions] = useState<number[]>([0, 0, 0, 0, 0, 0])
	const [jointVelocities, _setJointVelocities] = useState<number[]>([0, 0, 0, 0, 0, 0])
	const [endEffectorPose, _setEndEffectorPose] = useState<{
		x: number
		y: number
		z: number
		roll: number
		pitch: number
		yaw: number
	}>({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 })
	const [endEffectorVelocity, _setEndEffectorVelocity] = useState<{
		vx: number
		vy: number
		vz: number
		wx: number
		wy: number
		wz: number
	}>({ vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 })

	return (
		<div className="flex flex-col px-4 py-2 mb-2 text-sm rounded bg-vscode-sideBar-background text-vscode-foreground">
			<div className="font-bold mb-2">{t("robot:armState.title")}</div>

			<div className="mb-2">
				<div className="font-semibold mb-1">{t("robot:armState.jointState")}</div>
				<div className="grid grid-cols-2 gap-x-4 gap-y-1">
					{jointPositions.map((pos, index) => (
						<div key={`jp-${index}`}>
							{t("robot:armState.jointPosition", { number: index + 1 })}: {pos.toFixed(2)}
						</div>
					))}
					{jointVelocities.map((vel, index) => (
						<div key={`jv-${index}`}>
							{t("robot:armState.jointVelocity", { number: index + 1 })}: {vel.toFixed(2)}
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
