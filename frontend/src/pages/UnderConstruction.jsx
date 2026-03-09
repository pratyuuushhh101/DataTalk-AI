import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';

const UnderConstruction = () => {
    const location = useLocation();
    const isWhatsApp = location.state?.fromWhatsApp;
    const isOCR = location.state?.fromOCR;

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center animate-fade-in relative overflow-hidden">
            <div className="flex items-center gap-6 mb-10">
                <div className="text-7xl">
                    🚧
                </div>
                {isWhatsApp && (
                    <div className="w-24 h-24 bg-[#25D366]/10 rounded-3xl flex items-center justify-center shadow-xl shadow-[#25D366]/5 border border-[#25D366]/20">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a9.624 9.624 0 0 1-4.912-1.343l-.352-.21-3.655.959.976-3.561-.23-.367a9.625 9.625 0 1 1 8.173 4.522m0-16.142C6.444 2.994.012 9.427.012 17.356c0 2.532.651 5.004 1.888 7.187L.012 32l7.78-2.04a14.32 14.32 0 0 0 6.564 1.583c7.923 0 14.354-6.432 14.354-14.387 0-3.84-1.494-7.449-4.204-10.158A14.31 14.31 0 0 0 14.351 2.994z" />
                        </svg>
                    </div>
                )}
                {isOCR && (
                    <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/5 border border-blue-500/20">
                        <Camera className="w-12 h-12 text-blue-500" />
                    </div>
                )}
            </div>

            <h1 className="text-3xl lg:text-5xl font-bold text-white mb-6 tracking-tight max-w-4xl leading-tight">
                {isWhatsApp ? (
                    <>DataTalk on <span className="text-[#25D366]">WhatsApp</span>: Chat directly with your business data</>
                ) : isOCR ? (
                    <>Smart Log Scanner: <span className="text-blue-500 font-extrabold">Digitizing your physical ledgers</span> 📸</>
                ) : (
                    <>This Feature is <span className="text-accent underline underline-offset-8 decoration-accent/30">Under Construction</span></>
                )}
            </h1>

            <p className="text-gray-400 text-lg lg:text-xl max-w-2xl mb-12 leading-relaxed font-light">
                {isWhatsApp ? (
                    "Move from spreadsheets to conversations. Upload files, ask questions, and get insights right inside your WhatsApp chat."
                ) : isOCR ? (
                    "Turn photos of handwritten logs into actionable data. Our OCR engine automatically detects columns and extracts values for instant analysis."
                ) : (
                    "Our engineers are building this feature to empower Indian MSMEs. Stay tuned!"
                )}
            </p>

            <Link
                to="/datatalk"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl px-10 py-5 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl hover:shadow-accent/5"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${isWhatsApp ? 'bg-[#25D366]/5' : isOCR ? 'bg-blue-500/5' : 'bg-accent/5'} rounded-full blur-[140px] -z-10 pointer-events-none`} />
        </div>
    );
};

export default UnderConstruction;
