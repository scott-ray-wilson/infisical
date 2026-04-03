import { useMemo } from "react";

export type LineChartDataPoint = {
  label: string;
  value: number;
};

type LineChartProps = {
  data: LineChartDataPoint[];
  height?: number;
  color?: string;
};

const PADDING = { top: 24, right: 16, bottom: 32, left: 48 };

const getNiceTicks = (maxValue: number): number[] => {
  if (maxValue === 0) return [0];

  const rough = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;

  let step: number;
  if (residual <= 1.5) step = magnitude;
  else if (residual <= 3) step = 2 * magnitude;
  else if (residual <= 7) step = 5 * magnitude;
  else step = 10 * magnitude;

  const ticks: number[] = [];
  for (let v = 0; v <= maxValue + step * 0.1; v += step) {
    ticks.push(v);
  }
  return ticks;
};

const buildSmoothPath = (points: { x: number; y: number }[]): string => {
  if (points.length < 2) return "";

  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
};

export const LineChart = ({ data, height = 280, color = "#c8ff00" }: LineChartProps) => {
  const { ticks, points, chartWidth, chartHeight, areaPath, linePath } = useMemo(() => {
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const computedTicks = getNiceTicks(maxVal);
    const tickMax = computedTicks[computedTicks.length - 1];

    // Use a fixed aspect ratio width. The SVG viewBox makes it responsive.
    const svgWidth = 600;
    const cw = svgWidth - PADDING.left - PADDING.right;
    const ch = height - PADDING.top - PADDING.bottom;

    const pts = data.map((d, i) => ({
      x: PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * cw : cw / 2),
      y: PADDING.top + ch - (d.value / tickMax) * ch
    }));

    const lp = buildSmoothPath(pts);
    const ap = lp
      ? `${lp} L ${pts[pts.length - 1].x},${PADDING.top + ch} L ${pts[0].x},${PADDING.top + ch} Z`
      : "";

    return {
      ticks: computedTicks,
      points: pts,
      chartWidth: svgWidth,
      chartHeight: ch,
      areaPath: ap,
      linePath: lp
    };
  }, [data, height]);

  const yBase = PADDING.top + chartHeight;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${height}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines and Y-axis labels */}
      {ticks.map((tick) => {
        const tickMax = ticks[ticks.length - 1];
        const y = PADDING.top + chartHeight - (tick / tickMax) * chartHeight;
        return (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={chartWidth - PADDING.right}
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="4 4"
              strokeWidth={0.5}
            />
            <text
              x={PADDING.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-label text-[11px]"
            >
              {tick.toLocaleString()}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill={color} fillOpacity={0.08} />}

      {/* Line */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Dots and X-axis labels */}
      {points.map((pt, i) => (
        <g key={data[i].label}>
          <circle cx={pt.x} cy={pt.y} r={4} fill={color} />
          <circle cx={pt.x} cy={pt.y} r={2} fill="var(--color-container)" />
          <text x={pt.x} y={yBase + 20} textAnchor="middle" className="fill-label text-[11px]">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
};
