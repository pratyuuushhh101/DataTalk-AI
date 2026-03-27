const { spawn } = require('child_process');
const { processCVFrameAtEdge, resetEdgeState } = require('./cvStream.service.js');
const axios = require('axios');
const { classifyIntent } = require('./intent.service.js');

// --- Mocking Speech Edge ---
let edgeMemoryWindow = [];

function parseAndForwardSpeech(finalText) {
    console.log(`[SPEECH EDGE] [FINAL] ${finalText}`);

    const wordCount = finalText.trim().split(/\s+/).length;
    if (wordCount < 3) return;

    const { intent, confidence, entities } = classifyIntent(finalText);

    if (intent === "UNKNOWN") return;

    const now = Date.now();
    edgeMemoryWindow = edgeMemoryWindow.filter(ev => (now - ev.timestamp) <= 7000);

    const isSemanticDup = edgeMemoryWindow.some(ev => 
        ev.intent === intent && JSON.stringify(ev.entities) === JSON.stringify(entities)
    );

    if (isSemanticDup) return;
    edgeMemoryWindow.push({ timestamp: now, intent, entities });

    const event = {
        eventId: `speech_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        type: "SPEECH",
        text: finalText,
        speaker: "owner" // Mapped to owner for billing simulation
    };

    axios.post('http://localhost:8000/event', event).catch(e => {});
}

async function simulateFusion() {
    console.log("--- STARTING API SERVER ---");
    const server = spawn('node', ['../../server.js']);
    
    server.stdout.on('data', data => { 
        const logs = data.toString();
        if(logs.includes('OBSERVABILITY]') || logs.includes('ALERT') || logs.includes('Stabilizing')) {
             process.stdout.write("API DBG: " + logs);
        }
    });

    await new Promise(r => setTimeout(r, 1500));

    console.log("\n--- STARTING FULL FUSION (PHASE 2B) ---");

    // SCENARIO 1: Proper Billing (Aligning totals)
    // 1. Camera stabilizes 2 Lays (2 * 20 = 40)
    console.log("\n=== SCENARIO 1: Perfect Alignment (Laysx2 = 40) ===");
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]);
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]);
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // CV Event fired (value 40)
    
    await new Promise(r => setTimeout(r, 1000));

    // 2. Owner speaks billing
    parseAndForwardSpeech("your total is forty please");
    
    await new Promise(r => setTimeout(r, 3000));


    // SCENARIO 2: Flickering During Billing (Mismatch Grace Period works)
    console.log("\n=== SCENARIO 2: CV Flicker during Speech Mismatch ===");
    // 1. Owner speaks a new transaction while CV is empty because of an occlusion
    processCVFrameAtEdge([]); 
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([]); 
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([]); // Emits Empty Cart (value 0)

    await new Promise(r => setTimeout(r, 500));

    parseAndForwardSpeech("total is forty"); // Triggers MismatchTimer since CV=0, Speech=40
    
    await new Promise(r => setTimeout(r, 800)); // Still inside the 3s mismatch grace window
    
    // 2. Camera Recovers and stabilizes at 2 Lays (40)
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); 
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); 
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // Resolves the mismatch BEFORE 3 seconds!

    await new Promise(r => setTimeout(r, 3000));

    
    // SCENARIO 3: True Mismatch (Customer disputes, negotiation applied)
    console.log("\n=== SCENARIO 3: Genuine Mismatch + Negotiation ===");
    // 1. Camera stabilizes 1 Lays, 1 Coke (20 + 15 = 35)
    processCVFrameAtEdge([{ name: "lays", qty: 1 }, { name: "coke", qty: 1 }]);
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }, { name: "coke", qty: 1 }]);
    await new Promise(r => setTimeout(r, 300));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }, { name: "coke", qty: 1 }]); // Total 35

    await new Promise(r => setTimeout(r, 1000));
    
    // 2. Owner attempts to bill 40
    parseAndForwardSpeech("total is forty please");
    
    await new Promise(r => setTimeout(r, 3200)); // Wait > 3s. Mismatch Alert should fire!

    // 3. Owner realizes mistake, gives discount 5
    parseAndForwardSpeech("I will give discount of five");

    await new Promise(r => setTimeout(r, 2000));
    
    console.log("\n[Simulator] Tests complete. Shutting down after 2s.");
    setTimeout(() => {
        server.kill();
        process.exit(0);
    }, 2000);
}

simulateFusion();
