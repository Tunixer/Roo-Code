import React, { useState, useCallback, useEffect } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Button } from "@/components/ui/button"
import { HomeSetting } from "./home_setting"
import { AxisControl } from "./axis_control"
import { ViewPose } from "./common_interface"

// 机械臂状态接口
interface ArmState {
	// 连接状态
	connected: boolean
	enabled: boolean
	moving: boolean
	error: string | null

	// 当前位置和姿态
	currentPose: ViewPose

	// 关节状态
	jointPositions: number[]
	jointVelocities: number[]
	jointTorques: number[]
}

// 步长选项
type StepSize = "small" | "medium" | "large"

const STEP_SIZES = {
	small: { position: 1, orientation: 1 },
	medium: { position: 5, orientation: 5 },
	large: { position: 10, orientation: 10 },
}

// 默认Home位置
const DEFAULT_HOME_POSE: ViewPose = { x: 0, y: 0, z: 400, roll: 0, pitch: 0, yaw: 0 }

export const CytoR6ArmStatePreview: React.FC = () => {
	const { t } = useAppTranslation()

	// 机械臂状态
	const [armState, setArmState] = useState<ArmState>({
		connected: true,
		enabled: true,
		moving: false,
		error: null,
		currentPose: { x: 150.5, y: -200.3, z: 350.8, roll: 15.2, pitch: -5.7, yaw: 90.1 },
		jointPositions: [12.5, -45.3, 78.9, -23.1, 56.7, -89.4],
		jointVelocities: [0.1, -0.3, 0.5, -0.2, 0.4, -0.6],
		jointTorques: [2.3, -1.8, 4.2, -0.9, 3.1, -2.5],
	})

	// 目标位置
	const [targetPose, setTargetPose] = useState<ViewPose>(DEFAULT_HOME_POSE)

	// Home位置设置
	const [homePose, setHomePose] = useState<ViewPose>(DEFAULT_HOME_POSE)
	const [showHomeSettings, setShowHomeSettings] = useState(false)

	// 步长设置
	const [stepSize, setStepSize] = useState<StepSize>("medium")

	// 监听来自后端的消息
	const handleMessages = useCallback((event: MessageEvent) => {
		const message = event.data
		if (message.type === "arm_controller_update") {
			setArmState(message.data)
		}
	}, [])

	useEffect(() => {
		window.addEventListener("message", handleMessages)
		return () => window.removeEventListener("message", handleMessages)
	}, [handleMessages])

	// 发送命令到后端
	const sendCommand = useCallback((command: string, data?: any) => {
		window.parent.postMessage(
			{
				type: "robotCommand",
				command,
				data,
			},
			"*",
		)
	}, [])

	// 更新目标位置
	const updateTargetPose = useCallback(
		(axis: keyof ViewPose, value: number) => {
			setTargetPose((prev) => {
				const newPose = { ...prev, [axis]: value }
				// 自动执行移动命令
				if (armState.enabled && !armState.moving) {
					sendCommand("move_to_target", newPose)
				}
				return newPose
			})
		},
		[armState.enabled, armState.moving, sendCommand],
	)

	// 增减位置值
	const adjustValue = useCallback(
		(axis: keyof ViewPose, delta: number) => {
			setTargetPose((prev) => {
				const newPose = {
					...prev,
					[axis]: prev[axis] + delta,
				}
				// 自动执行移动命令
				if (armState.enabled && !armState.moving) {
					sendCommand("move_to_target", newPose)
				}
				return newPose
			})
		},
		[armState.enabled, armState.moving, sendCommand],
	)

	// 获取状态颜色
	const getStatusColor = () => {
		if (!armState.connected) return "text-red-500"
		if (armState.error) return "text-red-500"
		if (armState.moving) return "text-yellow-500"
		if (armState.enabled) return "text-green-500"
		return "text-gray-500"
	}

	// 获取状态文本
	const getStatusText = () => {
		if (!armState.connected) return t("robot:armController.disconnected")
		if (armState.error) return `${t("robot:armController.error")}: ${armState.error}`
		if (armState.moving) return t("robot:armController.moving")
		if (armState.enabled) return t("robot:armController.enabled")
		return t("robot:armController.disabled")
	}

	return (
		<div className="flex flex-col px-4 py-2 mb-2 text-sm rounded bg-vscode-sideBar-background text-vscode-foreground">
			<div className="font-bold mb-4 text-lg">{t("robot:armController.title")}</div>

			{/* 状态显示区域 */}
			<div className="mb-6 p-3 border border-vscode-input-border rounded">
				<div className="flex items-center justify-between mb-2">
					<span className="font-semibold">{t("robot:armController.status")}</span>
					<span className={`font-medium ${getStatusColor()}`}>{getStatusText()}</span>
				</div>

				<div className="grid grid-cols-2 gap-4 text-xs">
					<div>
						<div className="font-medium mb-1">{t("robot:armController.position")}</div>
						<div>
							X: {armState.currentPose.x.toFixed(2)} {t("robot:armController.units.mm")}
						</div>
						<div>
							Y: {armState.currentPose.y.toFixed(2)} {t("robot:armController.units.mm")}
						</div>
						<div>
							Z: {armState.currentPose.z.toFixed(2)} {t("robot:armController.units.mm")}
						</div>
					</div>
					<div>
						<div className="font-medium mb-1">{t("robot:armController.orientation")}</div>
						<div>
							R: {armState.currentPose.roll.toFixed(2)} {t("robot:armController.units.deg")}
						</div>
						<div>
							P: {armState.currentPose.pitch.toFixed(2)} {t("robot:armController.units.deg")}
						</div>
						<div>
							Y: {armState.currentPose.yaw.toFixed(2)} {t("robot:armController.units.deg")}
						</div>
					</div>
				</div>
			</div>

			{/* 控制按钮区域 */}
			<div className="mb-6">
				<div className="flex gap-2 mb-3">
					<Button
						variant={armState.enabled ? "destructive" : "default"}
						size="sm"
						onClick={() => sendCommand(armState.enabled ? "disable" : "enable")}
						disabled={!armState.connected}>
						{armState.enabled ? t("robot:armController.disable") : t("robot:armController.enable")}
					</Button>

					{/* Home按钮组 */}
					<div className="flex gap-1">
						<Button
							variant="secondary"
							size="sm"
							onClick={() => sendCommand("home", homePose)}
							disabled={!armState.enabled || armState.moving}>
							{t("robot:armController.goToHome")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowHomeSettings(!showHomeSettings)}
							disabled={!armState.connected}>
							⚙️
						</Button>
					</div>

					<Button variant="destructive" size="sm" onClick={() => sendCommand("emergency_stop")}>
						{t("robot:armController.emergencyStop")}
					</Button>

					<Button variant="outline" size="sm" onClick={() => sendCommand("reset")} disabled={armState.moving}>
						{t("robot:armController.reset")}
					</Button>
				</div>

				{/* Home位置设置面板 */}
				{showHomeSettings && (
					<HomeSetting
						homePose={homePose}
						setHomePose={setHomePose}
						armConnected={armState.connected}
						currentPose={armState.currentPose}
						onSendCommand={sendCommand}
					/>
				)}

				{/* 步长选择 */}
				<div className="flex items-center gap-2 mb-3">
					<span className="text-xs font-medium">{t("robot:armController.stepSize")}:</span>
					{(["small", "medium", "large"] as StepSize[]).map((size) => (
						<Button
							key={size}
							variant={stepSize === size ? "default" : "outline"}
							size="sm"
							onClick={() => setStepSize(size)}>
							{t(`robot:armController.${size}`)}
						</Button>
					))}
				</div>
			</div>

			{/* 笛卡尔位置控制 */}
			<div className="mb-6">
				<div className="font-semibold mb-3">{t("robot:armController.cartesianControl")}</div>

				{/* 位置控制 */}
				<div className="mb-4">
					<div className="font-medium mb-2">{t("robot:armController.position")}</div>

					<AxisControl
						label={t("robot:armController.xAxis")}
						currentValue={armState.currentPose.x}
						targetValue={targetPose.x}
						unit="mm"
						min={-500}
						max={500}
						step={0.1}
						stepSize={STEP_SIZES[stepSize].position}
						onAdjust={(delta) => adjustValue("x", delta)}
						onUpdate={(value) => updateTargetPose("x", value)}
						disabled={!armState.enabled || armState.moving}
					/>

					<AxisControl
						label={t("robot:armController.yAxis")}
						currentValue={armState.currentPose.y}
						targetValue={targetPose.y}
						unit="mm"
						min={-500}
						max={500}
						step={0.1}
						stepSize={STEP_SIZES[stepSize].position}
						onAdjust={(delta) => adjustValue("y", delta)}
						onUpdate={(value) => updateTargetPose("y", value)}
						disabled={!armState.enabled || armState.moving}
					/>

					<AxisControl
						label={t("robot:armController.zAxis")}
						currentValue={armState.currentPose.z}
						targetValue={targetPose.z}
						unit="mm"
						min={0}
						max={800}
						step={0.1}
						stepSize={STEP_SIZES[stepSize].position}
						onAdjust={(delta) => adjustValue("z", delta)}
						onUpdate={(value) => updateTargetPose("z", value)}
						disabled={!armState.enabled || armState.moving}
					/>
				</div>

				{/* 姿态控制 */}
				<div className="mb-4">
					<div className="font-medium mb-2">{t("robot:armController.orientation")}</div>

					<AxisControl
						label={t("robot:armController.roll")}
						currentValue={armState.currentPose.roll}
						targetValue={targetPose.roll}
						unit="°"
						min={-180}
						max={180}
						step={0.1}
						stepSize={STEP_SIZES[stepSize].orientation}
						onAdjust={(delta) => adjustValue("roll", delta)}
						onUpdate={(value) => updateTargetPose("roll", value)}
						disabled={!armState.enabled || armState.moving}
					/>

					<AxisControl
						label={t("robot:armController.pitch")}
						currentValue={armState.currentPose.pitch}
						targetValue={targetPose.pitch}
						unit="°"
						min={-90}
						max={90}
						step={0.1}
						stepSize={STEP_SIZES[stepSize].orientation}
						onAdjust={(delta) => adjustValue("pitch", delta)}
						onUpdate={(value) => updateTargetPose("pitch", value)}
						disabled={!armState.enabled || armState.moving}
					/>

					<AxisControl
						label={t("robot:armController.yaw")}
						currentValue={armState.currentPose.yaw}
						targetValue={targetPose.yaw}
						unit="°"
						min={-180}
						max={180}
						step={0.1}
						stepSize={STEP_SIZES[stepSize].orientation}
						onAdjust={(delta) => adjustValue("yaw", delta)}
						onUpdate={(value) => updateTargetPose("yaw", value)}
						disabled={!armState.enabled || armState.moving}
					/>
				</div>

				{/* 执行按钮 */}
				<div className="flex gap-2">
					<Button
						variant="secondary"
						onClick={() => sendCommand("stop")}
						disabled={!armState.enabled || !armState.moving}>
						{t("robot:armController.stop")}
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={() => setTargetPose(armState.currentPose)}
						disabled={!armState.connected}>
						{t("robot:armController.syncCurrentPose")}
					</Button>
				</div>
			</div>

			{/* 关节状态显示 */}
			<div>
				<div className="font-semibold mb-2">{t("robot:armState.jointState")}</div>
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
					{armState.jointPositions.map((pos, index) => (
						<div key={`joint-${index}`} className="flex justify-between">
							<span>{t("robot:armState.jointPosition", { number: index + 1 })}:</span>
							<span>{pos.toFixed(2)}°</span>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

// 演示组件，用于测试机械臂遥控器功能
export const ArmControllerDemo: React.FC = () => {
	const [demoState, setDemoState] = useState({
		connected: true,
		enabled: false,
		moving: false,
		error: null as string | null,
	})

	// 模拟状态变化
	const simulateStateChange = useCallback(
		(newState: Partial<typeof demoState>) => {
			setDemoState((prev) => ({ ...prev, ...newState }))

			// 模拟发送状态更新消息
			setTimeout(() => {
				window.postMessage(
					{
						type: "arm_controller_update",
						data: {
							...demoState,
							...newState,
							currentPose: { x: 150.5, y: -200.3, z: 350.8, roll: 15.2, pitch: -5.7, yaw: 90.1 },
							jointPositions: [12.5, -45.3, 78.9, -23.1, 56.7, -89.4],
							jointVelocities: [0.1, -0.3, 0.5, -0.2, 0.4, -0.6],
							jointTorques: [2.3, -1.8, 4.2, -0.9, 3.1, -2.5],
						},
					},
					"*",
				)
			}, 100)
		},
		[demoState],
	)

	// 监听来自遥控器的命令
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "arm_controller_command") {
				const { command, data } = event.data
				console.log("收到命令:", command, data)

				switch (command) {
					case "enable":
						simulateStateChange({ enabled: true })
						break
					case "disable":
						simulateStateChange({ enabled: false })
						break
					case "home":
						simulateStateChange({ moving: true })
						setTimeout(() => simulateStateChange({ moving: false }), 2000)
						break
					case "move_to_target":
						console.log("移动到目标位置:", data)
						simulateStateChange({ moving: true })
						setTimeout(() => simulateStateChange({ moving: false }), 3000)
						break
					case "stop":
						simulateStateChange({ moving: false })
						break
					case "emergency_stop":
						simulateStateChange({ enabled: false, moving: false, error: "急停触发" })
						break
					case "reset":
						simulateStateChange({ error: null })
						break
					case "save_home_position":
						console.log("保存Home位置:", data)
						break
					case "reset_home_position":
						console.log("重置Home位置")
						break
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [simulateStateChange])

	return (
		<div className="p-4">
			<h2 className="text-lg font-bold mb-4">机械臂遥控器演示</h2>
			<div className="mb-4 p-3 bg-gray-100 rounded">
				<h3 className="font-semibold mb-2">演示控制</h3>
				<div className="flex gap-2 mb-2">
					<button
						className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
						onClick={() => simulateStateChange({ connected: !demoState.connected })}>
						{demoState.connected ? "断开连接" : "连接"}
					</button>
					<button
						className="px-3 py-1 bg-red-500 text-white rounded text-sm"
						onClick={() => simulateStateChange({ error: demoState.error ? null : "模拟错误" })}>
						{demoState.error ? "清除错误" : "触发错误"}
					</button>
				</div>
				<div className="text-sm text-gray-600">
					当前状态: 连接={demoState.connected ? "是" : "否"}, 启用={demoState.enabled ? "是" : "否"}, 运动=
					{demoState.moving ? "是" : "否"}, 错误={demoState.error || "无"}
				</div>
			</div>
			<CytoR6ArmStatePreview />
		</div>
	)
}
