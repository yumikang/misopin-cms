"use client";

import React, { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface BarChartData {
  category: string;
  count: number;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartData[];
  dataKey?: string;
  title?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  horizontal?: boolean;
}

export const BarChart: React.FC<BarChartProps> = React.memo(({
  data,
  dataKey = 'count',
  title,
  height = 300,
  color = '#10b981', // Tailwind green-500
  showGrid = true,
  showLegend = false,
  horizontal = false,
}) => {
  // 색상 배열 (카테고리별 다른 색상 적용)
  const colors = useMemo(() => [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
  ], []);

  // 데이터 포맷팅 및 색상 매핑
  const formattedData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: colors[index % colors.length],
    }));
  }, [data, colors]);

  // 커스텀 툴팁
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-gray-600">
            {`${payload[0].name}: ${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={formattedData}
          layout={horizontal ? 'horizontal' : 'vertical'}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          )}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: '#6b7280' }}
                className="text-xs"
              />
              <YAxis
                dataKey="category"
                type="category"
                tick={{ fill: '#6b7280' }}
                className="text-xs"
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="category"
                tick={{ fill: '#6b7280' }}
                className="text-xs"
              />
              <YAxis
                tick={{ fill: '#6b7280' }}
                className="text-xs"
              />
            </>
          )}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[4, 4, 0, 0]}
            name="건수"
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
});

BarChart.displayName = 'BarChart';