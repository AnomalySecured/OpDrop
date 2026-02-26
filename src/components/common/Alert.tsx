interface AlertProps {
    type: 'error' | 'success' | 'warning' | 'info';
    children: React.ReactNode;
    onDismiss?: () => void;
}

export function Alert({ type, children, onDismiss }: AlertProps) {
    return (
        <div className={`alert alert-${type}`}>
            <span style={{ flex: 1 }}>{children}</span>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '16px',
                    }}
                >
                    x
                </button>
            )}
        </div>
    );
}
