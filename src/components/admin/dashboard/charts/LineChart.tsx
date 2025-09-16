"use client";

import React, { useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LineChartData {
  date: string;
  count: number;
  [key: string]: string | number;
}

interface LineChartProps {
  data: LineChartData[];
  dataKey?: string;
  title?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
}

export const LineChart: React.FC<LineChartProps> = React.memo(({
  data,
  dataKey = 'count',
  title,
  height = 300,
  color = '#3b82f6', // Tailwind blue-500
  showGrid = true,
  showLegend = false,
}) => {
  // 데이터 포맷팅 최적화
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data]);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          )}
          <XAxis
            dataKey="formattedDate"
            className="text-xs"
            tick={{ fill: '#6b7280' }} // Tailwind gray-500
          />
          <YAxis
            className="text-xs"
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
            labelStyle={{ color: '#111827' }}
            itemStyle={{ color }}
          />
          {showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="예약 수"
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
});

LineChart.displayName = 'LineChart';