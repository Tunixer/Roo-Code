import React, { useState, useCallback, useEffect } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HomeSetting } from "./home_setting"
import { AxisControl } from "./axis_control"
import { ViewPose } from "./common_interface"
import { vscode } from "@src/utils/vscode"

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

// 连接状态枚举
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

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

	// 连接设置
	const [ipAddress, setIpAddress] = useState("192.168.1.100")
	const [port, setPort] = useState("5555")
	const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
	const [showConnectionSettings, setShowConnectionSettings] = useState(false)

	// 机械臂状态
	const [armState, setArmState] = useState<ArmState>({
		connected: false,
		enabled: false,
		moving: false,
		error: null,
		currentPose: { x: 0, y: 0, z: 400, roll: 0, pitch: 0, yaw: 0 },
		jointPositions: [0, 0, 0, 0, 0, 0],
		jointVelocities: [0, 0, 0, 0, 0, 0],
		jointTorques: [0, 0, 0, 0, 0, 0],
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
		} else if (message.type === "arm_connection_status") {
			setConnectionStatus(message.status)
			if (message.status === "connected") {
				setArmState((prev) => ({ ...prev, connected: true, error: null }))
			} else if (message.status === "disconnected" || message.status === "error") {
				setArmState((prev) => ({ ...prev, connected: false, error: message.error || null }))
			}
		}
	}, [])

	useEffect(() => {
		window.addEventListener("message", handleMessages)
		return () => window.removeEventListener("message", handleMessages)
	}, [handleMessages])

	// 发送命令到后端
	const sendCommand = useCallback((command: string, data?: any) => {
		vscode.postMessage({
			type: "robotCommand",
			command,
			data,
		})
	}, [])

	// IP地址验证
	const isValidIpAddress = (ip: string): boolean => {
		const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
		return ipRegex.test(ip)
	}

	// 端口验证
	const isValidPort = (port: string): boolean => {
		const portNum = parseInt(port)
		return !isNaN(portNum) && portNum > 0 && portNum <= 65535
	}

	// 连接到机械臂
	const handleConnect = useCallback(() => {
		if (!isValidIpAddress(ipAddress)) {
			setArmState((prev) => ({ ...prev, error: t("robot:armController.connection.invalidIp") }))
			return
		}
		if (!isValidPort(port)) {
			setArmState((prev) => ({ ...prev, error: t("robot:armController.connection.invalidPort") }))
			return
		}

		setConnectionStatus("connecting")
		setArmState((prev) => ({ ...prev, error: null }))
		sendCommand("connect", { ipAddress, port: parseInt(port) })
	}, [ipAddress, port, sendCommand, t])

	// 断开连接
	const handleDisconnect = useCallback(() => {
		sendCommand("disconnect")
		setConnectionStatus("disconnected")
		setArmState((prev) => ({ ...prev, connected: false, enabled: false }))
	}, [sendCommand])

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

	// 获取连接状态颜色
	const getConnectionStatusColor = () => {
		switch (connectionStatus) {
			case "connected":
				return "text-green-500"
			case "connecting":
				return "text-yellow-500"
			case "error":
				return "text-red-500"
			default:
				return "text-gray-500"
		}
	}

	// 获取连接状态文本
	const getConnectionStatusText = () => {
		switch (connectionStatus) {
			case "connected":
				return t("robot:armController.connected")
			case "connecting":
				return t("robot:armController.connection.connecting")
			case "error":
				return t("robot:armController.connection.connectionFailed")
			default:
				return t("robot:armController.disconnected")
		}
	}

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

			{/* 连接设置区域 */}
			<div className="mb-6 p-3 border border-vscode-input-border rounded">
				<div className="flex items-center justify-between mb-3">
					<span className="font-semibold">{t("robot:armController.connection.title")}</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowConnectionSettings(!showConnectionSettings)}>
						⚙️
					</Button>
				</div>

				<div className="flex items-center justify-between mb-2">
					<span className="text-xs">{t("robot:armController.connection.connectionStatus")}:</span>
					<span className={`text-xs font-medium ${getConnectionStatusColor()}`}>
						{getConnectionStatusText()}
					</span>
				</div>

				{showConnectionSettings && (
					<div className="mt-3 space-y-3">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-xs font-medium mb-1">
									{t("robot:armController.connection.ipAddress")}
								</label>
								<Input
									type="text"
									value={ipAddress}
									onChange={(e) => setIpAddress(e.target.value)}
									placeholder={t("robot:armController.connection.ipPlaceholder")}
									disabled={connectionStatus === "connecting" || connectionStatus === "connected"}
									className="text-xs h-7"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">
									{t("robot:armController.connection.port")}
								</label>
								<Input
									type="text"
									value={port}
									onChange={(e) => setPort(e.target.value)}
									placeholder={t("robot:armController.connection.portPlaceholder")}
									disabled={connectionStatus === "connecting" || connectionStatus === "connected"}
									className="text-xs h-7"
								/>
							</div>
						</div>

						<div className="flex gap-2">
							{connectionStatus === "connected" ? (
								<Button variant="destructive" size="sm" onClick={handleDisconnect}>
									{t("robot:armController.connection.disconnect")}
								</Button>
							) : (
								<Button
									variant="default"
									size="sm"
									onClick={handleConnect}
									disabled={connectionStatus === "connecting"}>
									{connectionStatus === "connecting"
										? t("robot:armController.connection.connecting")
										: t("robot:armController.connection.connect")}
								</Button>
							)}
						</div>
					</div>
				)}
			</div>

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
