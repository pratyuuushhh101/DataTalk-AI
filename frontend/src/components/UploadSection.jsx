import React, { useRef, useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { uploadFile } from '../services/api';

const UploadSection = ({ onUploadSuccess, compact = false, onReset }) => {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);

    useEffect(() => {
        if (sessionStorage.getItem('datasetUploaded') === 'true') {
            const name = sessionStorage.getItem('datasetName');
            const size = sessionStorage.getItem('datasetSize');
            if (name) {
                setFile({ name, size: Number(size) || 0 });
                setUploadStatus({ type: 'success', message: 'Dataset active' });
            }
        }
    }, []);

    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile) return;
        setFile(selectedFile);
        setIsUploading(true);
        setUploadStatus(null);

        try {
            await uploadFile(selectedFile);
            sessionStorage.setItem('datasetUploaded', 'true');
            sessionStorage.setItem('datasetName', selectedFile.name);
            sessionStorage.setItem('datasetSize', selectedFile.size.toString());
            setUploadStatus({ type: 'success', message: 'Loaded into Azure SQL' });
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            setUploadStatus({ type: 'error', message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    };

    // Compact inline bar when dataset is already loaded
    if (compact) {
        return (
            <div
                style={{
                    backgroundColor: 'var(--dt-surface)',
                    borderColor: 'var(--dt-border)',
                    borderRadius: 'var(--dt-radius)'
                }}
                className="border px-3.5 py-2 flex items-center justify-between gap-3"
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".csv"
                />
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span style={{ color: 'var(--dt-text)' }} className="text-xs font-mono font-medium truncate">
                        {file?.name || sessionStorage.getItem('datasetName') || 'sales_data.csv'}
                    </span>
                    <span style={{ color: 'var(--dt-text-faint)' }} className="text-[11px] font-mono hidden sm:inline">
                        · Ready
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        style={{
                            backgroundColor: 'var(--dt-surface-2)',
                            borderColor: 'var(--dt-border)',
                            color: 'var(--dt-text-muted)',
                            borderRadius: 'var(--dt-radius)'
                        }}
                        className="px-2.5 py-1 text-[11px] font-mono border hover:opacity-80 flex items-center gap-1.5"
                    >
                        {isUploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
                        <span>Replace CSV</span>
                    </button>
                    {onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            style={{ color: 'var(--dt-text-faint)' }}
                            className="p-1 hover:opacity-80"
                            title="Clear session"
                        >
                            <RefreshCw size={13} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                backgroundColor: 'var(--dt-surface)',
                borderColor: 'var(--dt-border)',
                borderRadius: 'var(--dt-radius)'
            }}
            className="border p-6"
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".csv"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div
                        style={{
                            backgroundColor: 'var(--dt-surface-2)',
                            borderColor: 'var(--dt-border)',
                            borderRadius: 'var(--dt-radius)',
                            color: 'var(--dt-accent)'
                        }}
                        className="p-2.5 border shrink-0"
                    >
                        <FileSpreadsheet size={20} />
                    </div>
                    <div>
                        <h3 style={{ color: 'var(--dt-text)' }} className="text-sm font-semibold">
                            Import Retail Ledger (CSV)
                        </h3>
                        <p style={{ color: 'var(--dt-text-muted)' }} className="text-xs mt-0.5">
                            Columns auto-mapped: date, product, category, quantity, unit_cost, unit_price, region
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{
                        backgroundColor: 'var(--dt-accent)',
                        color: 'var(--dt-accent-text)',
                        borderRadius: 'var(--dt-radius)'
                    }}
                    className="px-4 py-2 text-xs font-mono font-semibold flex items-center gap-2 shrink-0"
                >
                    {isUploading ? (
                        <>
                            <Loader size={14} className="animate-spin" />
                            <span>INGESTING...</span>
                        </>
                    ) : (
                        <>
                            <Upload size={14} />
                            <span>SELECT CSV FILE</span>
                        </>
                    )}
                </button>
            </div>

            {uploadStatus && (
                <div
                    className={`mt-4 px-3 py-2 text-xs font-mono border flex items-center gap-2 ${
                        uploadStatus.type === 'error'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                    style={{ borderRadius: 'var(--dt-radius)' }}
                >
                    {uploadStatus.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                    <span>{uploadStatus.message}</span>
                </div>
            )}
        </div>
    );
};

export default UploadSection;
