interface ProgressBarProps {
    value: number; // 0-100
    label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, value));
    return (
        <div>
            {label && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                        {clamped.toFixed(1)}%
                    </span>
                </div>
            )}
            <div className="progress">
                <div className="progress-bar" style={{ width: `${clamped}%` }} />
            </div>
        </div>
    );
}
