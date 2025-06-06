import React, { useState, useCallback, useEffect } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AxisControl } from "./axis_control"
import { JointHomeSetting } from "./joint_home_setting"
import { vscode } from "@src/utils/vscode"

// 机械臂状态接口
interface ArmState {
	// 连接状态
	connected: boolean
	enabled: boolean
	moving: boolean
	error: string | null

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
	small: 1,
	medium: 5,
	large: 10,
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

// 默认关节位置
const DEFAULT_JOINT_POSITIONS = [0, 0, 90, 0, 90, 0]

export const CytoR6ArmJointPreview: React.FC = () => {
	const { t } = useAppTranslation()

	// 连接设置
	const [ipAddress, setIpAddress] = useState("127.0.0.1")
	const [port, setPort] = useState("5555")
	const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
	const [showConnectionSettings, setShowConnectionSettings] = useState(false)

	// 机械臂状态
	const [armState, setArmState] = useState<ArmState>({
		connected: false,
		enabled: false,
		moving: false,
		error: null,
		jointPositions: [...DEFAULT_JOINT_POSITIONS],
		jointVelocities: [0, 0, 0, 0, 0, 0],
		jointTorques: [0, 0, 0, 0, 0, 0],
	})

	// 目标关节位置
	const [targetJointPositions, setTargetJointPositions] = useState<number[]>([...DEFAULT_JOINT_POSITIONS])

	// Home关节位置设置
	const [homeJointPositions, setHomeJointPositions] = useState<number[]>([...DEFAULT_JOINT_POSITIONS])
	const [showHomeSettings, setShowHomeSettings] = useState(false)

	// 步长设置
	const [stepSize, setStepSize] = useState<StepSize>("medium")

	// 监听来自后端的消息
	const handleMessages = useCallback((event: MessageEvent) => {
		const message = event.data
		switch (message.type) {
			case "arm_controller_update":
				setArmState(message.data)
				break
			case "arm_connection_status":
				setConnectionStatus(message.status)
				if (message.status === "connected") {
					setArmState((prev) => ({ ...prev, connected: true, error: null }))
				} else if (message.status === "disconnected" || message.status === "error") {
					setArmState((prev) => ({ ...prev, connected: false, error: message.error || null }))
				}
				break
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

	// 更新目标关节位置
	const updateTargetJointPosition = useCallback(
		(jointIndex: number, value: number) => {
			setTargetJointPositions((prev) => {
				const newPositions = [...prev]
				newPositions[jointIndex] = value
				// 自动执行移动命令
				if (armState.enabled && !armState.moving) {
					sendCommand("move_joints", newPositions)
				}
				return newPositions
			})
		},
		[armState.enabled, armState.moving, sendCommand],
	)

	// 增减关节位置值
	const adjustJointValue = useCallback(
		(jointIndex: number, delta: number) => {
			setTargetJointPositions((prev) => {
				const newPositions = [...prev]
				const newValue = prev[jointIndex] + delta
				// 检查关节限制
				const limit = JOINT_LIMITS[jointIndex]
				newPositions[jointIndex] = Math.max(limit.min, Math.min(limit.max, newValue))
				
				// 自动执行移动命令
				if (armState.enabled && !armState.moving) {
					sendCommand("move_joints", newPositions)
				}
				return newPositions
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
			<div className="font-bold mb-4 text-lg">{t("robot:armController.jointControl")}</div>

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

				<div className="grid grid-cols-3 gap-4 text-xs">
					<div>
						<div className="font-medium mb-1">{t("robot:armState.jointPositions")}</div>
						{armState.jointPositions.map((pos, index) => (
							<div key={`current-joint-${index}`}>
								{t("robot:armState.jointPosition", { number: index + 1 })}: {pos.toFixed(2)}°
							</div>
						))}
					</div>
					<div>
						<div className="font-medium mb-1">{t("robot:armState.jointVelocities")}</div>
						{armState.jointVelocities.map((vel, index) => (
							<div key={`velocity-joint-${index}`}>
								{t("robot:armState.jointVelocity", { number: index + 1 })}: {vel.toFixed(2)}°/s
							</div>
						))}
					</div>
					<div>
						<div className="font-medium mb-1">{t("robot:armState.jointTorques")}</div>
						{armState.jointTorques.map((torque, index) => (
							<div key={`torque-joint-${index}`}>
								{t("robot:armState.jointTorque", { number: index + 1 })}: {torque.toFixed(2)} Nm
							</div>
						))}
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
							onClick={() => {
								setTargetJointPositions([...homeJointPositions])
								sendCommand("move_joints", homeJointPositions)
							}}
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
					<JointHomeSetting
						homeJointPositions={homeJointPositions}
						setHomeJointPositions={setHomeJointPositions}
						armConnected={armState.connected}
						currentJointPositions={armState.jointPositions}
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

			{/* 关节控制区域 */}
			<div className="mb-6">
				<div className="font-semibold mb-3">{t("robot:armController.jointControl")}</div>

				{JOINT_LIMITS.map((limit, index) => (
					<AxisControl
						key={`joint-${index}`}
						label={t("robot:armState.jointPosition", { number: index + 1 })}
						currentValue={armState.jointPositions[index]}
						targetValue={targetJointPositions[index]}
						unit="°"
						min={limit.min}
						max={limit.max}
						step={0.1}
						stepSize={STEP_SIZES[stepSize]}
						onAdjust={(delta) => adjustJointValue(index, delta)}
						onUpdate={(value) => updateTargetJointPosition(index, value)}
						disabled={!armState.enabled || armState.moving}
					/>
				))}

				{/* 执行按钮 */}
				<div className="flex gap-2 mt-4">
					<Button
						variant="secondary"
						onClick={() => sendCommand("stop")}
						disabled={!armState.enabled || !armState.moving}>
						{t("robot:armController.stop")}
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={() => setTargetJointPositions([...armState.jointPositions])}
						disabled={!armState.connected}>
						{t("robot:armController.syncCurrentJoints")}
					</Button>

					<Button
						variant="default"
						size="sm"
						onClick={() => sendCommand("move_joints", targetJointPositions)}
						disabled={!armState.enabled || armState.moving}>
						{t("robot:armController.executeMove")}
					</Button>
				</div>
			</div>


		</div>
	)
}
