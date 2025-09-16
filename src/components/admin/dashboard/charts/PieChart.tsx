"use client";

import React, { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PieChartData {
  status: string;
  count: number;
  [key: string]: string | number;
}

interface PieChartProps {
  data: PieChartData[];
  dataKey?: string;
  nameKey?: string;
  title?: string;
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
}

export const PieChart: React.FC<PieChartProps> = React.memo(({
  data,
  dataKey = 'count',
  nameKey = 'status',
  title,
  height = 300,
  showLegend = true,
  innerRadius = 0,
}) => {
  // 색상 팔레트
  const COLORS = useMemo(() => [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#6b7280', // gray-500
  ], []);

  // 총합 계산
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item[dataKey], 0);
  }, [data, dataKey]);

  // 퍼센트 포함 데이터 포맷팅
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      percentage: ((item[dataKey] / total) * 100).toFixed(1),
    }));
  }, [data, dataKey, total]);

  // 커스텀 라벨
  interface LabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percentage: number;
    index: number;
  }

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
    index,
  }: LabelProps) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percentage > 5 ? (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage}%`}
      </text>
    ) : null;
  };

  // 커스텀 툴팁
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: PieChartData & { percentage: string };
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data[nameKey]}</p>
          <p className="text-sm text-gray-600">
            {`${data[dataKey]}건 (${data.percentage}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  // 커스텀 레전드
  interface LegendProps {
    payload: Array<{
      value: string;
      color: string;
      payload: PieChartData;
    }>;
  }

  const renderLegend = (props: LegendProps) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600">
              {entry.value}: {entry.payload.count}건
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={height / 3}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={dataKey}
          >
            {formattedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={renderLegend} />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
});

PieChart.displayName = 'PieChart';