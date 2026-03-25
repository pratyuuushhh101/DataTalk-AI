// ─── DataTalk AI Demo Panel — Script ──────────────────────────────────────────
// Pure JS, no frameworks.
// All endpoints use hardcoded values — NO user input.
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:5000";

const outputBody = document.getElementById("output-body");
const outputLabel = document.getElementById("output-label");

// ─── API Caller ───────────────────────────────────────────────────────────────

async function callEndpoint(btnId, method, path, tagClass, label) {
    const btn = document.getElementById(btnId);
    const emoji = btn.querySelector(".emoji");
    const originalEmoji = emoji.textContent;

    // Disable + loading state
    btn.disabled = true;
    btn.classList.add("loading");
    emoji.textContent = "⏳";

    setOutput(label, tagClass, "Processing...");

    try {
        const opts = { method };
        if (method === "POST") {
            opts.headers = { "Content-Type": "application/json" };
        }

        const res = await fetch(`${BASE_URL}${path}`, opts);
        const data = await res.json();

        const timestamp = new Date().toLocaleTimeString();
        const formatted = JSON.stringify(data, null, 2);

        setOutput(label, tagClass,
            `<span class="timestamp">${timestamp}</span>\n${syntaxHighlight(formatted)}`
        );

        console.log(`[Demo Panel] ${label}:`, data);
    } catch (err) {
        setOutput(label, "tag-error",
            `❌ Request failed\n\n${err.message}\n\nMake sure the backend is running on ${BASE_URL}`
        );
        console.error(`[Demo Panel] ${label} failed:`, err);
    } finally {
        btn.disabled = false;
        btn.classList.remove("loading");
        emoji.textContent = originalEmoji;
    }
}

// ─── Output Rendering ─────────────────────────────────────────────────────────

function setOutput(label, tagClass, content) {
    outputLabel.className = `endpoint-tag ${tagClass}`;
    outputLabel.textContent = label;
    outputBody.innerHTML = `<span class="endpoint-tag ${tagClass}">${label}</span>\n${content}`;
}

function clearOutput() {
    outputBody.innerHTML = `<div class="empty-state">Click a button above to see the response</div>`;
    outputLabel.textContent = "Ready";
    outputLabel.className = "endpoint-tag";
}

// JSON syntax highlighting (pure JS)
function syntaxHighlight(json) {
    return json
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?/g, (match) => {
            let cls = "color: #34d399"; // string (green)
            if (/:$/.test(match)) {
                cls = "color: #a78bfa"; // key (purple)
            }
            return `<span style="${cls}">${match}</span>`;
        })
        .replace(/\b(true)\b/g, '<span style="color: #34d399">$1</span>')
        .replace(/\b(false)\b/g, '<span style="color: #f87171">$1</span>')
        .replace(/\b(null)\b/g, '<span style="color: #8892a8">$1</span>')
        .replace(/\b(-?\d+\.?\d*)\b/g, '<span style="color: #fb923c">$1</span>');
}

// ─── Button Handlers ──────────────────────────────────────────────────────────

document.getElementById("btn-founder").addEventListener("click", () => {
    callEndpoint("btn-founder", "POST", "/demo/founder-kit", "tag-founder", "POST /demo/founder-kit");
});

document.getElementById("btn-billing").addEventListener("click", () => {
    callEndpoint("btn-billing", "POST", "/demo/billing", "tag-billing", "POST /demo/billing");
});

document.getElementById("btn-lowstock").addEventListener("click", () => {
    callEndpoint("btn-lowstock", "POST", "/demo/low-stock", "tag-lowstock", "POST /demo/low-stock");
});

document.getElementById("btn-demand").addEventListener("click", () => {
    callEndpoint("btn-demand", "POST", "/demo/missed-demand", "tag-demand", "POST /demo/missed-demand");
});

document.getElementById("btn-insights").addEventListener("click", () => {
    callEndpoint("btn-insights", "GET", "/demo/insights", "tag-insights", "GET /demo/insights");
});

document.getElementById("btn-clear").addEventListener("click", clearOutput);

// ─── Webcam (Demo-Safe, Hardcoded Detection) ─────────────────────────────────

let cameraStream = null;
const detectionResults = [
    { name: "Lays Classic", detail: "Yellow packet detected (bright color match)", confidence: 92 },
    { name: "Maggi Noodles", detail: "Red-yellow packet detected", confidence: 87 },
    { name: "Coca-Cola 500ml", detail: "Red bottle detected (logo pattern)", confidence: 78 },
];

document.getElementById("btn-camera").addEventListener("click", async () => {
    const video = document.getElementById("webcam-video");
    const placeholder = document.getElementById("webcam-placeholder");
    const btn = document.getElementById("btn-camera");

    if (cameraStream) {
        // Stop camera
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
        video.style.display = "none";
        placeholder.style.display = "block";
        btn.querySelector(".label").textContent = "Start Camera";
        hideDetections();
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = cameraStream;
        video.style.display = "block";
        placeholder.style.display = "none";
        video.play();
        btn.querySelector(".label").textContent = "Stop Camera";

        // Simulate detection after 2 seconds
        setTimeout(() => showDetections(), 2000);
    } catch (err) {
        console.error("Camera access denied:", err);
        setOutput("Camera", "tag-error", `❌ Camera access denied\n\n${err.message}`);
    }
});

function showDetections() {
    const container = document.getElementById("detection-items");
    container.innerHTML = "";

    detectionResults.forEach((item, i) => {
        const el = document.createElement("div");
        el.className = "detection-item";
        el.innerHTML = `
            <div class="product-name">${item.name}</div>
            <div class="product-detail">${item.detail}</div>
            <div class="confidence">
                <div class="confidence-bar" id="conf-${i}"></div>
            </div>
        `;
        container.appendChild(el);

        // Stagger animation
        setTimeout(() => {
            el.classList.add("visible");
            document.getElementById(`conf-${i}`).style.width = `${item.confidence}%`;
        }, 400 * (i + 1));
    });
}

function hideDetections() {
    document.getElementById("detection-items").innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.82rem; text-align: center;">
            Start camera to see detections
        </div>
    `;
}
