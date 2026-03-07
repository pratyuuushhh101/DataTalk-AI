import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, Loader, FileSpreadsheet } from 'lucide-react';
import { uploadFile } from '../services/api';
import Card from './Card';

const UploadSection = ({ onUploadSuccess, currentLanguage }) => {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem('datasetUploaded') === 'true') {
            const name = sessionStorage.getItem('datasetName');
            const size = sessionStorage.getItem('datasetSize');
            if (name) {
                setFile({ name, size: Number(size) || 0 });
                setUploadStatus({
                    type: 'success',
                    message: currentLanguage === 'hi'
                        ? 'डेटासेट पृष्ठभूमि में सक्रिय है।'
                        : currentLanguage === 'bn'
                            ? 'ডেটাসেট ইতিমধ্যে উপলব্ধ।'
                            : 'Dataset is active in the current session.'
                });
            }
        }
    }, [currentLanguage]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setUploadStatus(null);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setUploadStatus(null);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const handleSubmit = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadStatus(null);

        try {
            await uploadFile(file);
            sessionStorage.setItem('datasetUploaded', 'true');
            sessionStorage.setItem('datasetName', file.name);
            sessionStorage.setItem('datasetSize', file.size.toString());
            setUploadStatus({
                type: 'success',
                message: currentLanguage === 'hi'
                    ? 'डेटासेट सफलतापूर्वक अपलोड किया गया!'
                    : currentLanguage === 'bn'
                        ? 'ডেটাসেট সফলভাবে আপলোড হয়েছে!'
                        : 'Dataset uploaded successfully! You can now ask questions.'
            });
            onUploadSuccess();
        } catch (error) {
            setUploadStatus({
                type: 'error',
                message: error.message
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="relative overflow-visible">
            {/* Step Badge */}
            <div className="flex items-center space-x-3 mb-4">
                <div className={`step-circle ${uploadStatus?.type === 'success' ? 'completed' : 'active'}`}>
                    {uploadStatus?.type === 'success' ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-200">Upload Your Dataset</h3>
                    <p className="text-xs text-gray-500">CSV or Excel files supported</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {/* Upload Visual Area */}
                <div
                    onClick={!isUploading ? handleUploadClick : undefined}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300
                        ${dragActive ? 'border-accent bg-[#B5FF7D]/5 scale-[1.02]' :
                            uploadStatus?.type === 'success' ? 'border-accent/40 bg-[#B5FF7D]/5' :
                                'border-white/10 hover:border-accent/30 bg-[#141416]/50 hover:bg-[#B5FF7D]/5'}`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />

                    <div className="flex flex-col items-center justify-center space-y-3">
                        {uploadStatus?.type === 'success' ? (
                            <div className="animate-bounce-in">
                                <div className="w-14 h-14 bg-accent/15 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-accent" />
                                </div>
                            </div>
                        ) : file ? (
                            <div className="animate-bounce-in">
                                <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center">
                                    <FileSpreadsheet className="w-7 h-7 text-accent" />
                                </div>
                            </div>
                        ) : (
                            <div className={`w-14 h-14 bg-accent/8 rounded-full flex items-center justify-center ${dragActive ? 'animate-bounce' : 'animate-float'}`}>
                                <UploadCloud className="w-7 h-7 text-gray-500" />
                            </div>
                        )}

                        <div className="text-sm">
                            {file ? (
                                <div className="space-y-1">
                                    <span className="font-semibold text-gray-200">{file.name}</span>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                            ) : (
                                <span className="text-gray-400">
                                    <span className="text-accent font-semibold">Click to upload</span> or drag and drop
                                    <br />
                                    <span className="text-xs text-gray-500">CSV or Excel files (max 10MB)</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!file || isUploading}
                    className={`w-full flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-sm
                        ${(!file || isUploading)
                            ? 'bg-gray-800 cursor-not-allowed text-gray-600'
                            : 'bg-gradient-to-r from-accent to-accent-dim text-background hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]'
                        }`}
                >
                    {isUploading ? (
                        <>
                            <Loader className="w-5 h-5 animate-spin mr-2" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-4 h-4 mr-2" />
                            Upload Dataset
                        </>
                    )}
                </button>

                {/* Status Message */}
                {uploadStatus && (
                    <div className={`p-3 rounded-xl text-sm flex items-start animate-fade-in-up ${uploadStatus.type === 'error'
                        ? 'bg-red-900/30 text-red-300 border border-red-500/20'
                        : 'bg-accent/10 text-accent border border-accent/20'
                        }`}>
                        {uploadStatus.type === 'error' ? (
                            <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                        )}
                        <span>{uploadStatus.message}</span>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default UploadSection;
