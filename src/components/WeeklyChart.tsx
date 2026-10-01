import { Bar, CartesianGrid, ComposedChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import type { Period } from "@shared/challenge";
import { fmtDay, fmtSteps } from "@/lib/format";
import { compactSteps, type WeekPoint } from "@/lib/progress";

export type ChartMode = "weekly" | "running";

interface Props {
  points: WeekPoint[];
  periods: readonly Period[];
  mode: ChartMode;
  animate: boolean;
}

const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: WeekPoint;
}

/** Rounded-top bar; a logged 0 is a short baseline stub so it reads as "entered". */
const WeekBar = ({ x = 0, y = 0, width = 0, height = 0, payload }: BarShapeProps) => {
  if (!payload || payload.steps === null) return null;
  const w = Math.max(width - 2, 1); // 2px gap between neighbours
  const left = x + (width - w) / 2;
  if (payload.steps === 0) {
    return <rect x={left} y={y - 2} width={w} height={2} rx={1} fill={MUTED} fillOpacity={0.5} />;
  }
  const r = Math.min(4, w / 2, height);
  const bottom = y + height;
  const d = `M${left},${bottom} V${y + r} Q${left},${y} ${left + r},${y} H${left + w - r} Q${left + w},${y} ${left + w},${y + r} V${bottom} Z`;
  return <path d={d} fill={PRIMARY} fillOpacity={payload.isBest ? 1 : 0.55} />;
};

const WeekTick = ({ x = 0, y = 0, payload, points }: { x?: number; y?: number; payload?: { value: number }; points: WeekPoint[] }) => {
  const p = payload ? points[payload.value - 1] : undefined;
  if (!p) return null;
  return (
    <text
      x={x}
      y={y + 12}
      textAnchor="middle"
      fontSize={11}
      fill={MUTED}
      fillOpacity={p.state === "future" ? 0.6 : 1}
      fontWeight={p.state === "current" ? 600 : 400}
    >
      {p.week}
    </text>
  );
};

const ChartTooltip = ({ active, payload, periods, mode }: TooltipProps<number, string> & { periods: readonly Period[]; mode: ChartMode }) => {
  const p = payload?.[0]?.payload as WeekPoint | undefined;
  if (!active || !p) return null;
  const period = periods[p.week - 1];
  let value: string;
  if (p.state === "future" && p.steps === null) value = "Not started";
  else if (mode === "running") value = `${fmtSteps(p.cumulative ?? 0)} so far`;
  else if (p.steps === null) value = "Not logged";
  else if (p.steps === 0) value = "0 logged";
  else value = `${fmtSteps(p.steps)} steps${p.isBest ? " · your best" : ""}`;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <div className="font-medium">
        Week {p.week}
        {p.state === "current" && <span className="font-normal text-muted-foreground"> · this week</span>}
      </div>
      <div className="text-muted-foreground">
        {fmtDay(period.start)} to {fmtDay(period.end)}
      </div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  );
};

/**
 * One chart, one axis: weekly bars or the running total. Loaded lazily so
 * recharts stays out of the first paint.
 */
const WeeklyChart = ({ points, periods, mode, animate }: Props) => {
  const hasData = points.some((p) => ((mode === "weekly" ? p.steps : p.cumulative) ?? 0) > 0);
  return (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%" accessibilityLayer>
      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
      <XAxis
        dataKey="week"
        tickLine={false}
        axisLine={{ stroke: "hsl(var(--border))" }}
        interval={0}
        tick={<WeekTick points={points} />}
        height={22}
        padding={mode === "running" ? { left: 14, right: 14 } : undefined}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={38}
        tickCount={4}
        allowDecimals={false}
        tick={{ fill: MUTED, fontSize: 11 }}
        tickFormatter={compactSteps}
        domain={hasData ? [0, "auto"] : [0, 1000]}
        ticks={hasData ? undefined : [0, 500, 1000]}
      />
      <Tooltip
        cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.6, stroke: "hsl(var(--border))" }}
        content={<ChartTooltip periods={periods} mode={mode} />}
        isAnimationActive={false}
      />
      {mode === "weekly" ? (
        <Bar dataKey="steps" shape={<WeekBar />} isAnimationActive={animate} animationDuration={400} />
      ) : (
        <Area
          dataKey="cumulative"
          type="linear"
          stroke={PRIMARY}
          strokeWidth={2}
          fill={PRIMARY}
          fillOpacity={0.08}
          connectNulls={false}
          dot={{ r: 3, fill: PRIMARY, stroke: PRIMARY, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: PRIMARY, stroke: "hsl(var(--card))", strokeWidth: 2 }}
          isAnimationActive={animate}
          animationDuration={400}
        />
      )}
    </ComposedChart>
  </ResponsiveContainer>
  );
};

export default WeeklyChart;
