"use client";

import React, { useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AreaChartData {
  date: string;
  value: number;
  [key: string]: string | number;
}

interface AreaChartProps {
  data: AreaChartData[];
  dataKeys?: string[];
  title?: string;
  height?: number;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
}

const AreaChartComponent: React.FC<AreaChartProps> = ({
  data,
  dataKeys = ['value'],
  title,
  height = 300,
  colors = ['#3b82f6', '#10b981', '#f59e0b'],
  showGrid = true,
  showLegend = false,
  stacked = false,
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

  // 그라디언트 정의
  const gradients = useMemo(() => {
    return colors.map((color, index) => {
      const id = `gradient-${index}`;
      return {
        id,
        color,
        gradient: (
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        ),
      };
    });
  }, [colors]);

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
          <p className="font-medium mb-1">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {`${item.name}: ${item.value}`}
            </p>
          ))}
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
        <RechartsAreaChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            {gradients.map(g => g.gradient)}
          </defs>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          )}
          <XAxis
            dataKey="formattedDate"
            className="text-xs"
            tick={{ fill: '#6b7280' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {dataKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId={stacked ? '1' : undefined}
              stroke={colors[index % colors.length]}
              fill={`url(#gradient-${index % gradients.length})`}
              strokeWidth={2}
              name={key}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

AreaChartComponent.displayName = 'AreaChart';

export const AreaChart = React.memo(AreaChartComponent);