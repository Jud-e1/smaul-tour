'use client';

interface BarChartProps {
  data: { label: string; value: number }[];
  prefix?: string;
  from?: string;
  to?: string;
}

export default function BarChart({
  data,
  prefix = '',
  from = '#34d399',
  to = '#14b8a6',
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: 160 }}>
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div key={d.label} className="group flex flex-1 flex-col items-center justify-end gap-2">
            <div className="text-[11px] font-semibold text-white/0 transition group-hover:text-white/70">
              {prefix}
              {Math.round(d.value)}
            </div>
            <div className="flex w-full items-end justify-center" style={{ height: 110 }}>
              <div
                className="w-full max-w-[28px] rounded-t-lg transition-all duration-500 ease-out"
                style={{
                  height: `${Math.max(pct, 3)}%`,
                  background: `linear-gradient(180deg, ${from}, ${to})`,
                  boxShadow: `0 0 18px -4px ${from}`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-white/40">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
