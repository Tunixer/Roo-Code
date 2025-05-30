import React, { useState, useEffect, useCallback, useRef } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js"
import { Line } from "react-chartjs-2"

// 注册Chart.js组件
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

// 定义最大历史数据点数量
const MAX_DATA_POINTS = 100

export const CytoR6ArmState: React.FC = () => {
	const { t } = useAppTranslation()

	// 当前状态数据
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

	// 历史数据
	const [jointPositionHistory, setJointPositionHistory] = useState<number[][]>(
		Array(6)
			.fill([])
			.map(() => Array(0)),
	)
	const [jointVelocityHistory, setJointVelocityHistory] = useState<number[][]>(
		Array(6)
			.fill([])
			.map(() => Array(0)),
	)
	const [_jointTorquesHistory, setJointTorquesHistory] = useState<number[][]>(
		Array(6)
			.fill([])
			.map(() => Array(0)),
	)
	const [posePositionHistory, setPosePositionHistory] = useState<{
		x: number[]
		y: number[]
		z: number[]
	}>({ x: [], y: [], z: [] })
	const [poseOrientationHistory, setPoseOrientationHistory] = useState<{
		roll: number[]
		pitch: number[]
		yaw: number[]
	}>({ roll: [], pitch: [], yaw: [] })
	const [_velocityLinearHistory, setVelocityLinearHistory] = useState<{
		vx: number[]
		vy: number[]
		vz: number[]
	}>({ vx: [], vy: [], vz: [] })
	const [_velocityAngularHistory, setVelocityAngularHistory] = useState<{
		wx: number[]
		wy: number[]
		wz: number[]
	}>({ wx: [], wy: [], wz: [] })

	// 时间标签
	const [timeLabels, setTimeLabels] = useState<string[]>([])

	// 添加历史数据的函数
	const addHistoryData = useCallback(() => {
		// 当前时间作为标签
		const now = new Date()
		const timeLabel = now.toLocaleTimeString("en-US", { hour12: false })

		setTimeLabels((prev) => {
			const newLabels = [...prev, timeLabel]
			return newLabels.length > MAX_DATA_POINTS ? newLabels.slice(-MAX_DATA_POINTS) : newLabels
		})

		// 更新关节位置历史
		setJointPositionHistory((prev) => {
			return prev.map((history, index) => {
				const newHistory = [...history, jointPosition[index]]
				return newHistory.length > MAX_DATA_POINTS ? newHistory.slice(-MAX_DATA_POINTS) : newHistory
			})
		})

		// 更新关节速度历史
		setJointVelocityHistory((prev) => {
			return prev.map((history, index) => {
				const newHistory = [...history, jointVelocity[index]]
				return newHistory.length > MAX_DATA_POINTS ? newHistory.slice(-MAX_DATA_POINTS) : newHistory
			})
		})

		// 更新关节力矩历史
		setJointTorquesHistory((prev) => {
			return prev.map((history, index) => {
				const newHistory = [...history, jointTorques[index]]
				return newHistory.length > MAX_DATA_POINTS ? newHistory.slice(-MAX_DATA_POINTS) : newHistory
			})
		})

		// 更新末端位置历史
		setPosePositionHistory((prev) => {
			const newX = [...prev.x, endEffectorPose.x]
			const newY = [...prev.y, endEffectorPose.y]
			const newZ = [...prev.z, endEffectorPose.z]
			return {
				x: newX.length > MAX_DATA_POINTS ? newX.slice(-MAX_DATA_POINTS) : newX,
				y: newY.length > MAX_DATA_POINTS ? newY.slice(-MAX_DATA_POINTS) : newY,
				z: newZ.length > MAX_DATA_POINTS ? newZ.slice(-MAX_DATA_POINTS) : newZ,
			}
		})

		// 更新末端姿态历史
		setPoseOrientationHistory((prev) => {
			const newRoll = [...prev.roll, endEffectorPose.roll]
			const newPitch = [...prev.pitch, endEffectorPose.pitch]
			const newYaw = [...prev.yaw, endEffectorPose.yaw]
			return {
				roll: newRoll.length > MAX_DATA_POINTS ? newRoll.slice(-MAX_DATA_POINTS) : newRoll,
				pitch: newPitch.length > MAX_DATA_POINTS ? newPitch.slice(-MAX_DATA_POINTS) : newPitch,
				yaw: newYaw.length > MAX_DATA_POINTS ? newYaw.slice(-MAX_DATA_POINTS) : newYaw,
			}
		})

		// 更新末端线速度历史
		setVelocityLinearHistory((prev) => {
			const newVx = [...prev.vx, endEffectorVelocity.vx]
			const newVy = [...prev.vy, endEffectorVelocity.vy]
			const newVz = [...prev.vz, endEffectorVelocity.vz]
			return {
				vx: newVx.length > MAX_DATA_POINTS ? newVx.slice(-MAX_DATA_POINTS) : newVx,
				vy: newVy.length > MAX_DATA_POINTS ? newVy.slice(-MAX_DATA_POINTS) : newVy,
				vz: newVz.length > MAX_DATA_POINTS ? newVz.slice(-MAX_DATA_POINTS) : newVz,
			}
		})

		// 更新末端角速度历史
		setVelocityAngularHistory((prev) => {
			const newWx = [...prev.wx, endEffectorVelocity.wx]
			const newWy = [...prev.wy, endEffectorVelocity.wy]
			const newWz = [...prev.wz, endEffectorVelocity.wz]
			return {
				wx: newWx.length > MAX_DATA_POINTS ? newWx.slice(-MAX_DATA_POINTS) : newWx,
				wy: newWy.length > MAX_DATA_POINTS ? newWy.slice(-MAX_DATA_POINTS) : newWy,
				wz: newWz.length > MAX_DATA_POINTS ? newWz.slice(-MAX_DATA_POINTS) : newWz,
			}
		})
	}, [jointPosition, jointVelocity, jointTorques, endEffectorPose, endEffectorVelocity])

	// 计时器引用，用于定期调用addHistoryData
	const timerRef = useRef<NodeJS.Timeout | null>(null)

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

				// 收到新数据后添加到历史记录
				addHistoryData()
			}
		},
		[addHistoryData],
	)

	useEffect(() => {
		window.addEventListener("message", handleMessages)

		// 如果没有收到消息，也要定期更新图表（模拟数据）
		timerRef.current = setInterval(addHistoryData, 2000)

		return () => {
			window.removeEventListener("message", handleMessages)
			if (timerRef.current) {
				clearInterval(timerRef.current)
			}
		}
	}, [handleMessages, addHistoryData])

	// 生成图表选项
	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		scales: {
			y: {
				beginAtZero: false,
			},
		},
		animation: {
			duration: 0, // 禁用动画以提高性能
		},
		plugins: {
			legend: {
				position: "top" as const,
			},
		},
	}

	// 关节位置图表数据
	const jointPositionChartData = {
		labels: timeLabels,
		datasets: jointPositionHistory.map((data, index) => ({
			label: t("robot:armState.jointPosition", { number: index + 1 }),
			data: data,
			borderColor: `hsl(${index * 60}, 70%, 50%)`,
			backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.5)`,
			borderWidth: 1,
			pointRadius: 0,
		})),
	}

	// 关节速度图表数据
	const jointVelocityChartData = {
		labels: timeLabels,
		datasets: jointVelocityHistory.map((data, index) => ({
			label: t("robot:armState.jointVelocity", { number: index + 1 }),
			data: data,
			borderColor: `hsl(${index * 60}, 70%, 50%)`,
			backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.5)`,
			borderWidth: 1,
			pointRadius: 0,
		})),
	}

	// 末端位置图表数据
	const endEffectorPositionChartData = {
		labels: timeLabels,
		datasets: [
			{
				label: "X",
				data: posePositionHistory.x,
				borderColor: "hsl(0, 70%, 50%)",
				backgroundColor: "hsla(0, 70%, 50%, 0.5)",
				borderWidth: 1,
				pointRadius: 0,
			},
			{
				label: "Y",
				data: posePositionHistory.y,
				borderColor: "hsl(120, 70%, 50%)",
				backgroundColor: "hsla(120, 70%, 50%, 0.5)",
				borderWidth: 1,
				pointRadius: 0,
			},
			{
				label: "Z",
				data: posePositionHistory.z,
				borderColor: "hsl(240, 70%, 50%)",
				backgroundColor: "hsla(240, 70%, 50%, 0.5)",
				borderWidth: 1,
				pointRadius: 0,
			},
		],
	}

	// 末端姿态图表数据
	const endEffectorOrientationChartData = {
		labels: timeLabels,
		datasets: [
			{
				label: "Roll",
				data: poseOrientationHistory.roll,
				borderColor: "hsl(0, 70%, 50%)",
				backgroundColor: "hsla(0, 70%, 50%, 0.5)",
				borderWidth: 1,
				pointRadius: 0,
			},
			{
				label: "Pitch",
				data: poseOrientationHistory.pitch,
				borderColor: "hsl(120, 70%, 50%)",
				backgroundColor: "hsla(120, 70%, 50%, 0.5)",
				borderWidth: 1,
				pointRadius: 0,
			},
			{
				label: "Yaw",
				data: poseOrientationHistory.yaw,
				borderColor: "hsl(240, 70%, 50%)",
				backgroundColor: "hsla(240, 70%, 50%, 0.5)",
				borderWidth: 1,
				pointRadius: 0,
			},
		],
	}

	return (
		<div className="flex flex-col px-4 py-2 mb-2 text-sm rounded bg-vscode-sideBar-background text-vscode-foreground">
			<div className="font-bold mb-2">{t("robot:armState.title")}</div>

			<div className="mb-4">
				<div className="font-semibold mb-2">{t("robot:armState.jointState")}</div>

				{/* 当前关节状态数值 */}
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
					{jointPosition.map((pos, index) => (
						<div key={`jp-${index}`}>
							{t("robot:armState.jointPosition", { number: index + 1 })}: {pos.toFixed(2)}
						</div>
					))}
				</div>

				{/* 关节位置图表 */}
				<div className="mb-3">
					<div className="text-xs font-medium mb-1">{t("robot:armState.jointPositionChart")}</div>
					<div style={{ height: "150px" }}>
						<Line options={chartOptions} data={jointPositionChartData} />
					</div>
				</div>

				{/* 关节速度图表 */}
				<div>
					<div className="text-xs font-medium mb-1">{t("robot:armState.jointVelocityChart")}</div>
					<div style={{ height: "150px" }}>
						<Line options={chartOptions} data={jointVelocityChartData} />
					</div>
				</div>
			</div>

			<div>
				<div className="font-semibold mb-2">{t("robot:armState.endEffectorState")}</div>

				{/* 当前末端位姿数值 */}
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
					<div>
						{t("robot:armState.posePosition")}: X: {endEffectorPose.x.toFixed(2)}, Y:{" "}
						{endEffectorPose.y.toFixed(2)}, Z: {endEffectorPose.z.toFixed(2)}
					</div>
					<div>
						{t("robot:armState.poseOrientation")}: R: {endEffectorPose.roll.toFixed(2)}, P:{" "}
						{endEffectorPose.pitch.toFixed(2)}, Y: {endEffectorPose.yaw.toFixed(2)}
					</div>
				</div>

				{/* 末端位置图表 */}
				<div className="mb-3">
					<div className="text-xs font-medium mb-1">{t("robot:armState.endEffectorPositionChart")}</div>
					<div style={{ height: "150px" }}>
						<Line options={chartOptions} data={endEffectorPositionChartData} />
					</div>
				</div>

				{/* 末端姿态图表 */}
				<div>
					<div className="text-xs font-medium mb-1">{t("robot:armState.endEffectorOrientationChart")}</div>
					<div style={{ height: "150px" }}>
						<Line options={chartOptions} data={endEffectorOrientationChartData} />
					</div>
				</div>
			</div>
		</div>
	)
}
