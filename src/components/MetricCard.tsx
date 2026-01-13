interface MetricCardProps {
  value: string | number;
  label: string;
  percentage?: number;
  subtitle?: string;
}

export function MetricCard({ value, label, percentage, subtitle }: MetricCardProps) {
  return (
    <div className="card-flat">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {percentage !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted">
            <div 
              className="h-full bg-card-foreground transition-all duration-500" 
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
        </div>
      )}
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}
