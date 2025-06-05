import React, { useState, useCallback } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { PoseDeg } from "@roo/shared/robot-types"

interface HomeSettingProps {
	homePose: PoseDeg
	setHomePose: React.Dispatch<React.SetStateAction<PoseDeg>>
	armConnected: boolean
	currentPose: PoseDeg
	onSendCommand: (command: string, data?: any) => void
}

const DEFAULT_HOME_POSE: PoseDeg = { x: 0, y: 0, z: 400, roll: 0, pitch: 0, yaw: 0 }

export const HomeSetting: React.FC<HomeSettingProps> = ({
	homePose,
	setHomePose,
	armConnected,
	currentPose,
	onSendCommand,
}) => {
	const { t } = useAppTranslation()
	const [homeMessage, setHomeMessage] = useState<string | null>(null)

	// 更新Home位置
	const updateHomePose = useCallback(
		(axis: keyof PoseDeg, value: number) => {
			setHomePose((prev) => ({ ...prev, [axis]: value }))
		},
		[setHomePose],
	)

	// 保存Home位置
	const saveHomePosition = useCallback(() => {
		// 发送保存Home位置命令到后端
		onSendCommand("save_home_position", homePose)
		setHomeMessage(t("robot:armController.homePositionSaved"))
		setTimeout(() => setHomeMessage(null), 3000)
	}, [homePose, onSendCommand, t])

	// 重置Home位置
	const resetHomePosition = useCallback(() => {
		setHomePose(DEFAULT_HOME_POSE)
		onSendCommand("reset_home_position")
		setHomeMessage(t("robot:armController.homePositionReset"))
		setTimeout(() => setHomeMessage(null), 3000)
	}, [setHomePose, onSendCommand, t])

	// 设置当前位置为Home位置
	const setCurrentAsHome = useCallback(() => {
		const newHomePose = { ...currentPose }
		setHomePose(newHomePose)
		onSendCommand("save_home_position", newHomePose)
		setHomeMessage(t("robot:armController.homePositionSaved"))
		setTimeout(() => setHomeMessage(null), 3000)
	}, [currentPose, setHomePose, onSendCommand, t])

	return (
		<div className="mb-4 p-3 border border-vscode-input-border rounded bg-vscode-input-background">
			<div className="flex items-center justify-between mb-3">
				<span className="font-semibold text-sm">{t("robot:armController.homeSettings")}</span>
				{homeMessage && <span className="text-xs text-green-500">{homeMessage}</span>}
			</div>

			{/* Home位置显示 */}
			<div className="grid grid-cols-2 gap-4 mb-3 text-xs">
				<div>
					<div className="font-medium mb-1">{t("robot:armController.position")}</div>
					<div>
						X: {homePose.x.toFixed(2)} {t("robot:armController.units.mm")}
					</div>
					<div>
						Y: {homePose.y.toFixed(2)} {t("robot:armController.units.mm")}
					</div>
					<div>
						Z: {homePose.z.toFixed(2)} {t("robot:armController.units.mm")}
					</div>
				</div>
				<div>
					<div className="font-medium mb-1">{t("robot:armController.orientation")}</div>
					<div>
						R: {homePose.roll.toFixed(2)} {t("robot:armController.units.deg")}
					</div>
					<div>
						P: {homePose.pitch.toFixed(2)} {t("robot:armController.units.deg")}
					</div>
					<div>
						Y: {homePose.yaw.toFixed(2)} {t("robot:armController.units.deg")}
					</div>
				</div>
			</div>

			{/* Home位置控制 */}
			<div className="space-y-2 mb-3">
				{/* X轴 */}
				<div className="flex items-center gap-2">
					<span className="w-8 text-xs">X:</span>
					<div className="flex-1">
						<Slider
							min={-500}
							max={500}
							step={0.1}
							value={[homePose.x]}
							onValueChange={([value]) => updateHomePose("x", value)}
						/>
					</div>
					<span className="w-16 text-xs text-center">{homePose.x.toFixed(1)} mm</span>
				</div>

				{/* Y轴 */}
				<div className="flex items-center gap-2">
					<span className="w-8 text-xs">Y:</span>
					<div className="flex-1">
						<Slider
							min={-500}
							max={500}
							step={0.1}
							value={[homePose.y]}
							onValueChange={([value]) => updateHomePose("y", value)}
						/>
					</div>
					<span className="w-16 text-xs text-center">{homePose.y.toFixed(1)} mm</span>
				</div>

				{/* Z轴 */}
				<div className="flex items-center gap-2">
					<span className="w-8 text-xs">Z:</span>
					<div className="flex-1">
						<Slider
							min={0}
							max={800}
							step={0.1}
							value={[homePose.z]}
							onValueChange={([value]) => updateHomePose("z", value)}
						/>
					</div>
					<span className="w-16 text-xs text-center">{homePose.z.toFixed(1)} mm</span>
				</div>

				{/* Roll */}
				<div className="flex items-center gap-2">
					<span className="w-8 text-xs">R:</span>
					<div className="flex-1">
						<Slider
							min={-180}
							max={180}
							step={0.1}
							value={[homePose.roll]}
							onValueChange={([value]) => updateHomePose("roll", value)}
						/>
					</div>
					<span className="w-16 text-xs text-center">{homePose.roll.toFixed(1)}°</span>
				</div>

				{/* Pitch */}
				<div className="flex items-center gap-2">
					<span className="w-8 text-xs">P:</span>
					<div className="flex-1">
						<Slider
							min={-90}
							max={90}
							step={0.1}
							value={[homePose.pitch]}
							onValueChange={([value]) => updateHomePose("pitch", value)}
						/>
					</div>
					<span className="w-16 text-xs text-center">{homePose.pitch.toFixed(1)}°</span>
				</div>

				{/* Yaw */}
				<div className="flex items-center gap-2">
					<span className="w-8 text-xs">Y:</span>
					<div className="flex-1">
						<Slider
							min={-180}
							max={180}
							step={0.1}
							value={[homePose.yaw]}
							onValueChange={([value]) => updateHomePose("yaw", value)}
						/>
					</div>
					<span className="w-16 text-xs text-center">{homePose.yaw.toFixed(1)}°</span>
				</div>
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
