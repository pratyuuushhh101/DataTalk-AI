import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Zap, Globe, ArrowRight, Copy, CheckCircle, Smartphone } from 'lucide-react';

// ── Sandbox configuration ────────────────────────────────────────────────────
// Update SANDBOX_NUMBER and SANDBOX_KEYWORD from your Twilio console
const SANDBOX_NUMBER = "+14155238886";
const SANDBOX_KEYWORD = "join settle-likely";
const WHATSAPP_DEEP_LINK = `https://wa.me/${SANDBOX_NUMBER.replace("+", "")}?text=${encodeURIComponent(SANDBOX_KEYWORD)}`;

// ── Sample conversations ──────────────────────────────────────────────────────
const DEMO_CHATS = [
    {
        lang: "English",
        flag: "🇬🇧",
        messages: [
            { from: "user", text: "Show me the top 5 products by revenue" },
            { from: "bot", text: "📊 Top 5 Products by Revenue:\n🔹 Product A — ₹4,20,000\n🔹 Product B — ₹3,85,000\n🔹 Product C — ₹3,10,500\n🔹 Product D — ₹2,90,000\n🔹 Product E — ₹2,45,750\n✅ Product A leads with nearly 18% of total revenue." },
        ]
    },
    {
        lang: "Hinglish",
        flag: "🇮🇳",
        messages: [
            { from: "user", text: "South region mein total profit kitna hua?" },
            { from: "bot", text: "📊 South Region ka Total Profit:\n🔹 Kul Profit: ₹12,45,800\n🔹 Sabse zyada profit July mein hua — ₹2,10,000\n✅ South region overall performance mein top 2 mein hai." },
        ]
    },
    {
        lang: "Hindi",
        flag: "🇮🇳",
        messages: [
            { from: "user", text: "सबसे कम बिकने वाला प्रोडक्ट कौन सा है?" },
            { from: "bot", text: "📊 सबसे कम बिकने वाला प्रोडक्ट:\n🔹 प्रोडक्ट का नाम: Widget Z\n🔹 कुल बिक्री: केवल 42 यूनिट\n✅ Widget Z की बिक्री बहुत कम है, इस पर ध्यान देने की ज़रूरत है।" },
        ]
    }
];

// ── Step card component ───────────────────────────────────────────────────────
const StepCard = ({ number, title, description, extra, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.45, ease: "easeOut" }}
        className="relative flex gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-[#25D366]/20 hover:bg-[#25D366]/[0.03] transition-all duration-300 group"
    >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] font-bold text-sm group-hover:bg-[#25D366]/20 transition-colors duration-300">
            {number}
        </div>
        <div className="flex flex-col gap-1">
            <p className="text-white font-semibold text-sm">{title}</p>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
            {extra && <div className="mt-2">{extra}</div>}
        </div>
    </motion.div>
);

// ── Copy button ───────────────────────────────────────────────────────────────
const CopyButton = ({ text }) => {
    const [copied, setCopied] = React.useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-all duration-200 active:scale-95"
        >
            {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy"}
        </button>
    );
};

// ── Demo chat bubble ──────────────────────────────────────────────────────────
const ChatBubble = ({ msg, index }) => {
    const isUser = msg.from === "user";
    return (
        <motion.div
            initial={{ opacity: 0, x: isUser ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.3 }}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
        >
            <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line shadow-md ${isUser
                    ? "bg-[#25D366] text-black rounded-br-sm font-medium"
                    : "bg-[#1e1e20] border border-white/[0.07] text-gray-200 rounded-bl-sm"
                    }`}
            >
                {msg.text}
            </div>
        </motion.div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const WhatsAppChatbotPage = () => {
    const [activeDemo, setActiveDemo] = React.useState(0);

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white px-6 py-10 overflow-y-auto">

            {/* ── Background glow ── */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#25D366]/5 rounded-full blur-[160px] -z-10 pointer-events-none" />

            <div className="max-w-5xl mx-auto">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-5 mb-12"
                >
                    <div className="w-16 h-16 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center shadow-2xl shadow-[#25D366]/10">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a9.624 9.624 0 0 1-4.912-1.343l-.352-.21-3.655.959.976-3.561-.23-.367a9.625 9.625 0 1 1 8.173 4.522m0-16.142C6.444 2.994.012 9.427.012 17.356c0 2.532.651 5.004 1.888 7.187L.012 32l7.78-2.04a14.32 14.32 0 0 0 6.564 1.583c7.923 0 14.354-6.432 14.354-14.387 0-3.84-1.494-7.449-4.204-10.158A14.31 14.31 0 0 0 14.351 2.994z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            DataTalk on <span className="text-[#25D366]">WhatsApp</span>
                        </h1>
                        <p className="text-gray-400 mt-1 text-sm">Chat with your business data — in any language, right from WhatsApp</p>
                    </div>
                </motion.div>

                {/* ── Feature pills ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap gap-3 mb-12"
                >
                    {[
                        { icon: <Globe size={13} />, label: "Any language" },
                        { icon: <Zap size={13} />, label: "Instant insights" },
                        { icon: <MessageSquare size={13} />, label: "Natural conversation" },
                        { icon: <Smartphone size={13} />, label: "Works on any phone" },
                    ].map((pill, i) => (
                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/15 text-[#25D366] text-xs font-medium">
                            {pill.icon} {pill.label}
                        </span>
                    ))}
                </motion.div>

                {/* ── Main grid: Setup + Demo ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

                    {/* Left: Setup Steps */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-semibold text-white mb-1">Get Started in 3 Steps</h2>

                        <StepCard
                            number="1"
                            delay={0.3}
                            title="Open WhatsApp"
                            description={`Save our sandbox number to your contacts: ${SANDBOX_NUMBER}`}
                            extra={
                                <div className="flex items-center gap-2 font-mono text-xs bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-gray-300">
                                    {SANDBOX_NUMBER}
                                    <CopyButton text={SANDBOX_NUMBER} />
                                </div>
                            }
                        />

                        <StepCard
                            number="2"
                            delay={0.4}
                            title='Send the join message'
                            description="Send the exact activation message below to join the sandbox. You only need to do this once."
                            extra={
                                <div className="flex items-center gap-2 font-mono text-xs bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[#25D366]">
                                    {SANDBOX_KEYWORD}
                                    <CopyButton text={SANDBOX_KEYWORD} />
                                </div>
                            }
                        />

                        <StepCard
                            number="3"
                            delay={0.5}
                            title="Start asking questions!"
                            description="Once connected, ask anything about your sales data — in English, Hindi, Kannada, or any language you're comfortable with."
                        />

                        {/* CTA Button */}
                        <motion.a
                            href={WHATSAPP_DEEP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="mt-2 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20c35a] text-black font-bold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#25D366]/20 text-sm"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a9.624 9.624 0 0 1-4.912-1.343l-.352-.21-3.655.959.976-3.561-.23-.367a9.625 9.625 0 1 1 8.173 4.522m0-16.142C6.444 2.994.012 9.427.012 17.356c0 2.532.651 5.004 1.888 7.187L.012 32l7.78-2.04a14.32 14.32 0 0 0 6.564 1.583c7.923 0 14.354-6.432 14.354-14.387 0-3.84-1.494-7.449-4.204-10.158A14.31 14.31 0 0 0 14.351 2.994z" />
                            </svg>
                            Open WhatsApp & Connect
                            <ArrowRight size={16} />
                        </motion.a>
                    </div>

                    {/* Right: Live Demo Chat Preview */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-lg font-semibold text-white">Language Preview</h2>
                            <div className="flex gap-1">
                                {DEMO_CHATS.map((demo, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveDemo(i)}
                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${activeDemo === i
                                            ? "bg-[#25D366] text-black"
                                            : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {demo.flag} {demo.lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Phone mockup */}
                        <motion.div
                            key={activeDemo}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-2xl bg-[#111112] border border-white/[0.06] overflow-hidden shadow-2xl"
                        >
                            {/* WhatsApp-style header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1c] border-b border-white/[0.05]">
                                <div className="w-8 h-8 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a9.624 9.624 0 0 1-4.912-1.343l-.352-.21-3.655.959.976-3.561-.23-.367a9.625 9.625 0 1 1 8.173 4.522m0-16.142C6.444 2.994.012 9.427.012 17.356c0 2.532.651 5.004 1.888 7.187L.012 32l7.78-2.04a14.32 14.32 0 0 0 6.564 1.583c7.923 0 14.354-6.432 14.354-14.387 0-3.84-1.494-7.449-4.204-10.158A14.31 14.31 0 0 0 14.351 2.994z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-white text-sm font-semibold">DataTalk AI</p>
                                    <p className="text-[#25D366] text-xs">online</p>
                                </div>
                            </div>

                            {/* Chat area */}
                            <div className="flex flex-col gap-3 px-4 py-5 min-h-[260px] bg-[#0d0d0f]">
                                {DEMO_CHATS[activeDemo].messages.map((msg, i) => (
                                    <ChatBubble key={i} msg={msg} index={i} />
                                ))}
                            </div>
                        </motion.div>

                        {/* Info badge */}
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-blue-400 text-xs leading-relaxed">
                            <span className="mt-0.5 shrink-0">ℹ️</span>
                            <span>The bot automatically detects the language of your message and replies in the same language — no configuration needed.</span>
                        </div>
                    </div>
                </div>

                {/* ── Developer webhook info ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-8"
                >
                    <p className="text-sm font-semibold text-gray-300 mb-3">🛠️ Developer — Webhook Setup</p>
                    <p className="text-gray-500 text-xs mb-3 leading-relaxed">
                        Twilio needs a public URL to forward incoming messages. Run <code className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300">ngrok http 5000</code> and paste the URL below into the Twilio console.
                    </p>
                    <div className="font-mono text-xs text-[#25D366] bg-black/30 border border-white/10 rounded-lg px-3 py-2">
                        https://&lt;your-ngrok-id&gt;.ngrok.io/whatsapp/webhook
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default WhatsAppChatbotPage;
