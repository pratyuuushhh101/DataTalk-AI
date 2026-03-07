import React, { useState, useEffect } from 'react';
import { Database, Search, Download, Loader, AlertCircle } from 'lucide-react';
import RawDataTable from '../components/RawDataTable';
import { runQuery } from '../services/api';
import Card from '../components/Card';

const DataLedgerPage = () => {
    const [hasDataset, setHasDataset] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const uploaded = sessionStorage.getItem('datasetUploaded');
        if (uploaded === 'true') {
            setHasDataset(true);
            fetchInitialData();
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await runQuery("Show the first 100 rows of this dataset");
            if (response.data) {
                setData(response.data);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch ledger data.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!hasDataset) {
        return (
            <div className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex-1 bg-card-bg backdrop-blur-md rounded-2xl shadow-lg border border-card-border flex items-center justify-center p-12 min-h-[500px]">
                    <div className="text-center max-w-sm animate-fade-in">
                        <div className="w-20 h-20 bg-accent/8 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-float">
                            <Database className="w-10 h-10 text-accent/60" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-100 mb-2">
                            Welcome to DataTalk AI
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Upload a dataset to begin analyzing your business data.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 max-w-[90rem] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-fade-in-up">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Database className="text-accent w-8 h-8" />
                            Data Ledger
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Explore and filter your raw dataset rows.</p>
                    </div>

                    {/* UI Placeholder Controls */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search records..."
                                className="w-full bg-[#141416]/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500/20 flex items-start space-x-3 animate-fade-in">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-red-300">Error loading ledger</h3>
                            <p className="mt-0.5 text-sm text-red-400">{error}</p>
                        </div>
                    </div>
                )}

                {/* Content Section */}
                {isLoading ? (
                    <div className="bg-card-bg backdrop-blur-md rounded-2xl border border-card-border p-5 space-y-4 animate-fade-in">
                        <div className="skeleton h-6 w-48 mb-6" />
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton h-12 w-full rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                        {data && data.length > 0 ? (
                            <RawDataTable data={data} inline />
                        ) : (
                            <Card className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                                <Database className="w-12 h-12 text-gray-600 mb-4" />
                                <h3 className="text-lg font-bold text-gray-300 mb-2">No Data Found</h3>
                                <p className="text-sm text-gray-500">The dataset appears to be empty or could not be displayed.</p>
                            </Card>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DataLedgerPage;
