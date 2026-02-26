import { useState, useRef, useCallback } from 'react';
import { parseAirdropCSV } from '../../utils/csv.js';
import type { ParsedCSVRow } from '../../types/index.js';

interface CSVUploaderProps {
    onParsed: (rows: ParsedCSVRow[]) => void;
}

export function CSVUploader({ onParsed }: CSVUploaderProps) {
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handlePaste = useCallback((raw: string) => {
        setText(raw);
        if (raw.trim()) {
            const parsed = parseAirdropCSV(raw);
            onParsed(parsed);
        } else {
            onParsed([]);
        }
    }, [onParsed]);

    const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            handlePaste(content);
        };
        reader.readAsText(file);
    }, [handlePaste]);

    return (
        <div>
            <div className="input-group">
                <label className="input-label">Recipient List</label>
                <textarea
                    className="input"
                    placeholder={`Paste addresses and amounts (one per line):\n0x1234...abcd, 100\n0x5678...efgh, 250\ntb1q...addr, 50`}
                    value={text}
                    onChange={(e) => handlePaste(e.target.value)}
                    rows={8}
                />
                <p className="input-hint">
                    Format: address, amount (CSV, space, or tab separated). First row skipped if header detected.
                </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>or</span>
                <div
                    className="file-upload"
                    style={{ flex: 1, padding: 16 }}
                    onClick={() => fileRef.current?.click()}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.txt"
                        style={{ display: 'none' }}
                        onChange={handleFile}
                    />
                    <div className="file-upload-text">
                        {fileName ? `Loaded: ${fileName}` : 'Click to upload CSV file'}
                    </div>
                </div>
            </div>
        </div>
    );
}
