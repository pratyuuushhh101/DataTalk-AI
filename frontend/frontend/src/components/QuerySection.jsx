import React from 'react';
import { Send, Loader, Lock } from 'lucide-react';
import Card from './Card';

const QuerySection = ({ uploaded, loading, question, setQuestion, onSubmit, currentLanguage }) => {
    const isButtonDisabled = !uploaded || loading || !question.trim();

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isButtonDisabled) {
            onSubmit();
        }
    };

    const placeholderText = {
        en: "E.g. What is the total revenue by product category?",
        hi: "उदा. उत्पाद श्रेणी के अनुसार कुल राजस्व क्या है?",
        kn: "ಉದಾ. ಉತ್ಪನ್ನ ವರ್ಗದ ಪ್ರಕಾರ ಒಟ್ಟು ಆದಾಯ ಎಷ್ಟು?"
    };

    return (
        <Card className={`relative transition-all duration-300 ${!uploaded ? 'bg-gray-50 border-gray-200 opacity-75' : ''}`}>
            {!uploaded && (
                <div className="absolute inset-0 bg-white/50 z-10 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                    <div className="flex items-center space-x-2 text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Please upload a dataset first</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col mb-2">
                <label htmlFor="query-input" className="text-sm font-semibold text-gray-700 mb-2 truncate">
                    Ask a question about your data
                </label>

                <div className="relative flex items-center w-full">
                    <input
                        id="query-input"
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!uploaded || loading}
                        placeholder={placeholderText[currentLanguage] || placeholderText.en}
                        className="w-full px-4 py-3 pr-24 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-purple focus:border-transparent text-gray-900 shadow-sm transition-all"
                    />
                    <button
                        onClick={onSubmit}
                        disabled={isButtonDisabled}
                        className={`absolute right-1.5 flex items-center justify-center px-4 py-1.5 rounded-md font-medium text-white transition-all shadow-sm
              ${isButtonDisabled
                                ? 'bg-gray-300 cursor-not-allowed text-gray-100'
                                : 'bg-primary-purple hover:bg-purple-700 active:scale-95 hover:shadow'
                            }`}
                    >
                        {loading ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span className="mr-2">Ask</span>
                                <Send className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 ml-1">
                    Powered by Azure OpenAI. Read-only queries are safely executed.
                </p>
            </div>
        </Card>
    );
};

export default QuerySection;
