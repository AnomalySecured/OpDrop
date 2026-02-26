import type { ParsedCSVRow } from '../../types/index.js';

interface ValidationResultsProps {
    rows: ParsedCSVRow[];
}

export function ValidationResults({ rows }: ValidationResultsProps) {
    if (rows.length === 0) return null;

    const valid = rows.filter((r) => r.valid);
    const invalid = rows.filter((r) => !r.valid);

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>
                    <strong style={{ color: 'var(--success)' }}>{valid.length}</strong> valid
                </span>
                {invalid.length > 0 && (
                    <span style={{ fontSize: 14 }}>
                        <strong style={{ color: 'var(--danger)' }}>{invalid.length}</strong> invalid
                    </span>
                )}
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    {rows.length} total
                </span>
            </div>

            {invalid.length > 0 && (
                <div className="validation-list">
                    {invalid.map((row, i) => (
                        <div key={i} className="validation-item validation-err">
                            <span>!</span>
                            <span>{row.error}</span>
                        </div>
                    ))}
                </div>
            )}

            {valid.length > 0 && valid.length <= 20 && (
                <div className="validation-list" style={{ marginTop: 8 }}>
                    {valid.map((row, i) => (
                        <div key={i} className="validation-item validation-ok">
                            <span>+</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                {row.address.length > 20
                                    ? `${row.address.slice(0, 10)}...${row.address.slice(-6)}`
                                    : row.address
                                }{' '}
                                = {row.amount}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
