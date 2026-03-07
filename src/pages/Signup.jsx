import React, { useState } from 'react';
import { Mail, Phone, Lock, User, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
    const [signupMethod, setSignupMethod] = useState('email'); // 'email' or 'phone'
    const navigate = useNavigate();

    const handleSignup = (e) => {
        e.preventDefault();
        // Placeholder signup logic
        navigate('/datatalk');
    };

    return (
        <div className="min-h-screen bg-[#0f0f11] flex flex-col items-center justify-center p-4 font-sans text-gray-200">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[80%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 mb-4 rounded-full bg-[#B5FF7D] flex items-center justify-center shrink-0 relative shadow-[0_0_20px_var(--color-accent-glow)]">
                        <div className="w-4 h-4 rounded-sm bg-[#0f0f11] transform rotate-45" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-[#0f0f11] bg-transparent opacity-30" />
                    </div>
                    <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Create an Account</h1>
                    <p className="text-gray-400 text-sm">Join DataTalk AI to get started</p>
                </div>

                {/* Signup Card */}
                <div className="bg-[#1a1a1c] border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                    {/* Method Toggle */}
                    <div className="flex p-1 bg-[#0f0f11] rounded-xl mb-6">
                        <button
                            onClick={() => setSignupMethod('email')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${signupMethod === 'email'
                                ? 'bg-[#1a1a1c] text-white shadow-sm border border-white/5'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Email
                        </button>
                        <button
                            onClick={() => setSignupMethod('phone')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${signupMethod === 'phone'
                                ? 'bg-[#1a1a1c] text-white shadow-sm border border-white/5'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Phone
                        </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleSignup}>
                        {/* Name Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Jane Doe"
                                    className="w-full bg-[#0f0f11] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Contact Field (Email or Phone) */}
                        {signupMethod === 'email' ? (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        className="w-full bg-[#0f0f11] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        className="w-full bg-[#0f0f11] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Create Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-500" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-[#0f0f11] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 ml-1 mt-1">Must be at least 8 characters long</p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full mt-6 bg-[#B5FF7D] hover:bg-[#a2e570] text-black font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all group shadow-[0_4px_14px_0_rgba(181,255,125,0.2)] hover:shadow-[0_6px_20px_rgba(181,255,125,0.3)]"
                        >
                            <span>Create Account</span>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        Already have an account? <Link to="/login" className="text-accent hover:text-white transition-colors sm:ml-1">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
