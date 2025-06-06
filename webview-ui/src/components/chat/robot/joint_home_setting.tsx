import React, { useState, useCallback } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface JointHomeSettingProps {
	homeJointPositions: number[]
	setHomeJointPositions: React.Dispatch<React.SetStateAction<number[]>>
	armConnected: boolean
	currentJointPositions: number[]
	onSendCommand: (command: string, data?: any) => void
}

// 关节限制配置
const JOINT_LIMITS = [
	{ min: -180, max: 180, name: "Joint 1" }, // 基座旋转
	{ min: -90, max: 90, name: "Joint 2" },   // 肩部
	{ min: -135, max: 135, name: "Joint 3" }, // 肘部
	{ min: -180, max: 180, name: "Joint 4" }, // 腕部旋转1
	{ min: -90, max: 90, name: "Joint 5" },   // 腕部旋转2
	{ min: -180, max: 180, name: "Joint 6" }, // 末端旋转
]

const DEFAULT_JOINT_POSITIONS = [0, 0, 90, 0, 90, 0]

export const JointHomeSetting: React.FC<JointHomeSettingProps> = ({
	homeJointPositions,
	setHomeJointPositions,
	armConnected,
	currentJointPositions,
	onSendCommand,
}) => {
	const { t } = useAppTranslation()
	const [homeMessage, setHomeMessage] = useState<string | null>(null)

	// 更新Home关节位置
	const updateHomeJointPosition = useCallback(
		(jointIndex: number, value: number) => {
			setHomeJointPositions((prev) => {
				const newPositions = [...prev]
				newPositions[jointIndex] = value
				return newPositions
			})
		},
		[setHomeJointPositions],
	)

	// 保存Home位置
	const saveHomePosition = useCallback(() => {
		// 发送保存Home位置命令到后端
		onSendCommand("save_home_joints", homeJointPositions)
		setHomeMessage(t("robot:armController.homePositionSaved"))
		setTimeout(() => setHomeMessage(null), 3000)
	}, [homeJointPositions, onSendCommand, t])

	// 重置Home位置
	const resetHomePosition = useCallback(() => {
		setHomeJointPositions([...DEFAULT_JOINT_POSITIONS])
		onSendCommand("reset_home_joints")
		setHomeMessage(t("robot:armController.homePositionReset"))
		setTimeout(() => setHomeMessage(null), 3000)
	}, [setHomeJointPositions, onSendCommand, t])

	// 设置当前位置为Home位置
	const setCurrentAsHome = useCallback(() => {
		const newHomePositions = [...currentJointPositions]
		setHomeJointPositions(newHomePositions)
		onSendCommand("save_home_joints", newHomePositions)
		setHomeMessage(t("robot:armController.homePositionSaved"))
		setTimeout(() => setHomeMessage(null), 3000)
	}, [currentJointPositions, setHomeJointPositions, onSendCommand, t])

	return (
		<div className="mb-4 p-3 border border-vscode-input-border rounded bg-vscode-input-background">
			<div className="flex items-center justify-between mb-3">
				<span className="font-semibold text-sm">{t("robot:armController.homeSettings")}</span>
				{homeMessage && <span className="text-xs text-green-500">{homeMessage}</span>}
			</div>

			{/* Home关节位置显示 */}
			<div className="grid grid-cols-2 gap-4 mb-3 text-xs">
				<div>
					<div className="font-medium mb-1">{t("robot:armState.jointPositions")} (1-3)</div>
					{homeJointPositions.slice(0, 3).map((pos, index) => (
						<div key={`home-joint-${index}`}>
							{t("robot:armState.jointPosition", { number: index + 1 })}: {pos.toFixed(2)}°
						</div>
					))}
				</div>
				<div>
					<div className="font-medium mb-1">{t("robot:armState.jointPositions")} (4-6)</div>
					{homeJointPositions.slice(3, 6).map((pos, index) => (
						<div key={`home-joint-${index + 3}`}>
							{t("robot:armState.jointPosition", { number: index + 4 })}: {pos.toFixed(2)}°
						</div>
					))}
				</div>
			</div>

			{/* Home关节位置控制 */}
			<div className="space-y-2 mb-3">
				{JOINT_LIMITS.map((limit, index) => (
					<div key={`joint-slider-${index}`} className="flex items-center gap-2">
						<span className="w-12 text-xs">J{index + 1}:</span>
						<div className="flex-1">
							<Slider
								min={limit.min}
								max={limit.max}
								step={0.1}
								value={[homeJointPositions[index]]}
								onValueChange={([value]) => updateHomeJointPosition(index, value)}
							/>
						</div>
						<span className="w-16 text-xs text-center">{homeJointPositions[index].toFixed(1)}°</span>
					</div>
				))}
			</div>

			{/* Home位置操作按钮 */}
			<div className="flex gap-2">
				<Button variant="default" size="sm" onClick={saveHomePosition}>
					{t("robot:armController.saveHomePosition")}
				</Button>

				<Button variant="outline" size="sm" onClick={setCurrentAsHome} disabled={!armConnected}>
					{t("robot:armController.setHomePosition")}
				</Button>

				<Button variant="secondary" size="sm" onClick={resetHomePosition}>
					{t("robot:armController.resetHomePosition")}
				</Button>
			</div>
		</div>
	)
} 