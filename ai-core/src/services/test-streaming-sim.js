const { spawn } = require('child_process');
const axios = require('axios');
const { classifyIntent } = require('./intent.service.js');

let edgeMemoryWindow = [];

function parseAndForward(finalText) {
    console.log(`[FINAL] ${finalText}`);

    const wordCount = finalText.trim().split(/\s+/).length;
    if (wordCount < 3) {
        console.log(`[DROPPED] Transcript too short (< 3 words)`);
        return;
    }

    const { intent, confidence, entities } = classifyIntent(finalText);
    console.log(`[INTENT] ${intent} | ${JSON.stringify(entities)}`);

    if (intent === "UNKNOWN") {
        console.log(`[DROPPED] Edge Filter: UNKNOWN Intent.`);
        return;
    }

    const now = Date.now();
    edgeMemoryWindow = edgeMemoryWindow.filter(ev => (now - ev.timestamp) <= 7000);

    const isSemanticDup = edgeMemoryWindow.some(ev => 
        ev.intent === intent && JSON.stringify(ev.entities) === JSON.stringify(entities)
    );

    if (isSemanticDup) {
        console.log(`[DROPPED] Edge Filter: 7s Semantic Duplicate recognized.`);
        return;
    }

    edgeMemoryWindow.push({ timestamp: now, intent, entities });

    const event = {
        eventId: `speech_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        type: "SPEECH",
        text: finalText,
        speaker: "unknown"
    };

    axios.post('http://localhost:8000/event', event)
        .catch(err => console.error("Failed to send event:", err.message));
}

async function runStreamingTest() {
    console.log("--- STARTING API SERVER ---");
    const server = spawn('node', ['../../server.js']);
    // Filter server logs to just the essentials otherwise output gets too messy
    server.stdout.on('data', data => { if(data.toString().includes('ALERT') || data.toString().includes('Stabilizing')) process.stdout.write("API DBG: " + data) });
    server.stderr.on('data', data => process.stderr.write(data));

    await new Promise(r => setTimeout(r, 1000));

    console.log("\n--- STARTING SPEECH STREAMING PHASE 2A.1 ---");

    // Scenario A: Valid billing 
    console.log("\n=== SCENARIO A: Valid Event ===");
    console.log("[PARTIAL] total");
    await new Promise(r => setTimeout(r, 200));
    console.log("[PARTIAL] total wait actually");
    await new Promise(r => setTimeout(r, 200));
    parseAndForward("actually total 50"); 

    await new Promise(r => setTimeout(r, 2000)); // allow stabilization timeout to finish

    // Scenario B: Noise
    console.log("\n=== SCENARIO B: Noise/Short Event ===");
    console.log("[PARTIAL] uh");
    await new Promise(r => setTimeout(r, 200));
    parseAndForward("uh ok"); 

    await new Promise(r => setTimeout(r, 1000));

    // Scenario C: UNKNOWN intent dropping
    console.log("\n=== SCENARIO C: Long text but UNKNOWN meaning ===");
    console.log("[PARTIAL] did you watch");
    await new Promise(r => setTimeout(r, 200));
    parseAndForward("did you watch the game"); 

    await new Promise(r => setTimeout(r, 1000));

    // Scenario D: 7s rolling Edge Deduplication
    console.log("\n=== SCENARIO D: Temporal Semantic Dedup (7s window) ===");
    console.log("[PARTIAL] could you check");
    await new Promise(r => setTimeout(r, 200));
    parseAndForward("could you check stock of pepsi"); 

    await new Promise(r => setTimeout(r, 1000));

    // Semantic dup inside 7s window
    console.log("[PARTIAL] hey check stock");
    parseAndForward("hey check stock of pepsi"); 

    // Wait until 7s window passes (8s delay)
    console.log("\n[⏳] Waiting 8 seconds to flush edge memory window...");
    await new Promise(r => setTimeout(r, 8000));
    
    // Repeat OUTSIDE 7s window
    parseAndForward("check stock of pepsi again");

    console.log("\n[Simulator] Tests complete. Shutting down after 2s.");
    setTimeout(() => {
        server.kill();
        process.exit(0);
    }, 2000);
}

simulateStream();
