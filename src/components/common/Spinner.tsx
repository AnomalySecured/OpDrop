interface SpinnerProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ text, size = 'md' }: SpinnerProps) {
    const px = size === 'sm' ? 16 : size === 'lg' ? 32 : 20;
    return (
        <div className="loading-overlay">
            <div className="spinner" style={{ width: px, height: px }} />
            {text && <span>{text}</span>}
        </div>
    );
}
