import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, Package, MessageSquare, ShoppingCart, Volume2 } from 'lucide-react';

export const AIResponseCard = ({ response, onDismiss }) => {
    useEffect(() => {
        if (!response) return;

        // Auto dismiss after 6 seconds
        const timer = setTimeout(() => {
            onDismiss(response.timestamp);
        }, 6000);

        // TTS Read Aloud
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const msg = new SpeechSynthesisUtterance(response.message);
            // Optional: specify language, e.g. Hindi
            // msg.lang = 'hi-IN';
            msg.rate = 1.0;
            window.speechSynthesis.speak(msg);
        }

        return () => {
            clearTimeout(timer);
        };
    }, [response, onDismiss]);

    if (!response) return null;

    const getIcon = () => {
        switch (response.category) {
            case 'inventory': return <Package className="w-6 h-6 text-emerald-400" />;
            case 'analytics': return <Zap className="w-6 h-6 text-blue-400" />;
            case 'order': return <ShoppingCart className="w-6 h-6 text-amber-400" />;
            case 'guided':
            default: return <MessageSquare className="w-6 h-6 text-purple-400" />;
        }
    };

    const getColors = () => {
        switch (response.category) {
            case 'inventory': return 'from-emerald-900/40 to-[#0f172a] shadow-emerald-500/10 border-emerald-500/30 bg-emerald-500/20';
            case 'analytics': return 'from-blue-900/40 to-[#0f172a] shadow-blue-500/10 border-blue-500/30 bg-blue-500/20';
            case 'order': return 'from-amber-900/40 to-[#0f172a] shadow-amber-500/10 border-amber-500/30 bg-amber-500/20';
            case 'guided':
            default: return 'from-purple-900/40 to-[#0f172a] shadow-purple-500/10 border-purple-500/30 bg-purple-500/20';
        }
    };

    const colors = getColors();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative p-5 flex gap-4 items-start rounded-2xl bg-gradient-to-br ${colors} shadow-2xl border backdrop-blur-md`}
        >
            <div className={`p-3 rounded-xl shrink-0 ${colors.split(' ').pop()} flex items-center justify-center`}>
                {getIcon()}
            </div>

            <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="text-gray-300 text-[11px] font-black tracking-widest uppercase">
                        AI Assistant
                    </h4>
                    <Volume2 size={12} className="text-gray-500" />
                </div>
                <p className="text-white text-base font-medium leading-relaxed drop-shadow-md">
                    {response.message}
                </p>
            </div>

            <button
                onClick={() => {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    onDismiss(response.timestamp);
                }}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
            >
                <X size={18} />
            </button>
        </motion.div>
    );
};
