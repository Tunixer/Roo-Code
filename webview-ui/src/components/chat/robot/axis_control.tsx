import React from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface AxisControlProps {
	label: string
	currentValue: number
	targetValue: number
	unit: string
	min: number
	max: number
	step: number
	stepSize: number
	onAdjust: (delta: number) => void
	onUpdate: (value: number) => void
	disabled?: boolean
}

export const AxisControl: React.FC<AxisControlProps> = ({
	label,
	currentValue,
	targetValue,
	unit,
	min,
	max,
	step,
	stepSize,
	onAdjust,
	onUpdate,
	disabled = false,
}) => {
	const { t } = useAppTranslation()

	return (
		<div className="mb-3">
			<div className="flex items-center justify-between mb-1">
				<span className="text-xs">{label}</span>
				<span className="text-xs">
					{t("robot:armController.currentValue", {
						value: `${currentValue.toFixed(2)} ${unit}`,
					})}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" onClick={() => onAdjust(-stepSize)} disabled={disabled}>
					-
				</Button>
				<div className="flex-1">
					<Slider
						min={min}
						max={max}
						step={step}
						value={[targetValue]}
						onValueChange={([value]) => onUpdate(value)}
						disabled={disabled}
					/>
				</div>
				<Button variant="outline" size="sm" onClick={() => onAdjust(stepSize)} disabled={disabled}>
					+
				</Button>
				<span className="w-16 text-xs text-center">
					{targetValue.toFixed(1)} {unit}
				</span>
			</div>
		</div>
	)
}
