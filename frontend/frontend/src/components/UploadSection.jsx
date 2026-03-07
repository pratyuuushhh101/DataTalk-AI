import React, { useRef, useState } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { uploadFile } from '../services/api';
import Card from './Card';

const UploadSection = ({ onUploadSuccess, currentLanguage }) => {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success' | 'error', message: '' }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setUploadStatus(null);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadStatus(null);

        try {
            await uploadFile(file);
            setUploadStatus({
                type: 'success',
                message: currentLanguage === 'en' ? 'Dataset uploaded successfully! You can now ask questions.' : 'डेटासेट सफलतापूर्वक अपलोड किया गया!'
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
        <Card className="mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">

                {/* Upload Visual Area */}
                <div
                    onClick={!isUploading ? handleUploadClick : undefined}
                    className={`flex-1 w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${uploadStatus?.type === 'success' ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-primary-blue bg-gray-50'}`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />

                    <div className="flex flex-col items-center justify-center space-y-2">
                        {uploadStatus?.type === 'success' ? (
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        ) : file ? (
                            <File className="w-10 h-10 text-primary-purple" />
                        ) : (
                            <UploadCloud className="w-10 h-10 text-gray-400" />
                        )}

                        <div className="text-sm">
                            {file ? (
                                <span className="font-medium text-gray-900">{file.name}</span>
                            ) : (
                                <span className="text-gray-500">
                                    <span className="text-primary-blue font-semibold">Click to upload</span> or drag and drop<br />
                                    CSV or Excel files only
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                <div className="flex flex-col w-full md:w-64 space-y-3 shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={!file || isUploading}
                        className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium text-white transition-all shadow-sm
              ${(!file || isUploading)
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-primary-blue hover:bg-blue-600 hover:shadow-md active:transform active:scale-95'
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin mr-2" />
                                Uploading...
                            </>
                        ) : (
                            'Upload Dataset'
                        )}
                    </button>

                    {uploadStatus && (
                        <div className={`p-3 rounded-md text-sm flex items-start ${uploadStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
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
            </div>
        </Card>
    );
};

export default UploadSection;
