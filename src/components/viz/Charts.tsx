import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Line } from 'recharts';
import type { TrendPoint } from '@/hooks/useFusion';

export function ConfidenceTrend({ data, height = 180 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="gHosp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <RTooltip
          contentStyle={{ background: '#0e1626', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Area type="monotone" dataKey="hospital" name="Hospital fuel conf." stroke="#f43f5e" strokeWidth={2} fill="url(#gHosp)" />
        <Line type="monotone" dataKey="highway" name="Highway closure conf." stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
