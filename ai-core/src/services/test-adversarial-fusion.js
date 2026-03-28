const { spawn } = require('child_process');
const { processCVFrameAtEdge, resetEdgeState } = require('./cvStream.service.js');
const axios = require('axios');
const { classifyIntent } = require('./intent.service.js');

// --- Mocking Speech Edge ---
let edgeMemoryWindow = [];

function parseAndForwardSpeech(finalText, speaker = "owner") {
    console.log(`\n[SPEECH EDGE] [FINAL] ${finalText}`);

    const wordCount = finalText.trim().split(/\s+/).length;
    if (wordCount < 1) return; // Allow 1 word for "no"

    const { intent, confidence, entities } = classifyIntent(finalText);

    if (intent === "UNKNOWN") {
        console.log(`[SPEECH EDGE] Dropped UNKNOWN`);
        return;
    }

    const now = Date.now();
    edgeMemoryWindow = edgeMemoryWindow.filter(ev => (now - ev.timestamp) <= 7000);

    const isSemanticDup = edgeMemoryWindow.some(ev => 
        ev.intent === intent && JSON.stringify(ev.entities) === JSON.stringify(entities)
    );

    if (isSemanticDup) {
       console.log(`[SPEECH EDGE] Suppressed 7s semantic dup`);
       return;
    }

    edgeMemoryWindow.push({ timestamp: now, intent, entities });

    const event = {
        eventId: `speech_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        type: "SPEECH",
        text: finalText,
        speaker: speaker
    };

    axios.post('http://localhost:8000/event', event).catch(e => {});
}

async function simulateAdversarialFusion() {
    console.log("--- STARTING API SERVER ---");
    const server = spawn('node', ['../../server.js']);
    
    server.stdout.on('data', data => { 
        const logs = data.toString();
        if(logs.includes('OBSERVABILITY]') || logs.includes('ALERT') || logs.includes('Stabilizing') || logs.includes('Triggered Actions')) {
             process.stdout.write("API DBG: " + logs);
        }
    });

    await new Promise(r => setTimeout(r, 1500));

    console.log("\n\n=======================================================");
    console.log("             ADVERSARIAL FUSION TESTING");
    console.log("=======================================================\n");

    // ---------------------------------------------------------
    // TEST 1: Repeated Negotiation
    // ---------------------------------------------------------
    console.log("\n=== TEST 1: Repeated Negotiation ===");
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // total 40
    await new Promise(r => setTimeout(r, 200));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]);
    await new Promise(r => setTimeout(r, 200));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); 
    await new Promise(r => setTimeout(r, 1000));

    parseAndForwardSpeech("total 40", "owner");
    await new Promise(r => setTimeout(r, 2000)); // allow billing stabilization
    parseAndForwardSpeech("I give discount 5", "owner");
    await new Promise(r => setTimeout(r, 500));
    // Simulate user repeating bypasses 7s cache by slight entity/intent variance or just forcefully push to test core backend
    const event1 = { eventId: `speech_${Date.now()}_1`, timestamp: Date.now(), type: "SPEECH", text: "discount 5", speaker: "owner" };
    axios.post('http://localhost:8000/event', event1).catch();
    await new Promise(r => setTimeout(r, 500));
    const event2 = { eventId: `speech_${Date.now()}_2`, timestamp: Date.now(), type: "SPEECH", text: "discount 5", speaker: "owner" };
    axios.post('http://localhost:8000/event', event2).catch();
    await new Promise(r => setTimeout(r, 1000));


    // ---------------------------------------------------------
    // TEST 2: Context Shift Mid-Transaction
    // ---------------------------------------------------------
    console.log("\n=== TEST 2: Context Shift ===");
    parseAndForwardSpeech("do you have coke", "customer");
    await new Promise(r => setTimeout(r, 1000));
    parseAndForwardSpeech("no", "owner");
    await new Promise(r => setTimeout(r, 1000));
    parseAndForwardSpeech("give pepsi instead", "customer"); // Should be PRODUCT_QUERY or UNKNOWN based on our rule. Wait, our parser relies on "do you have" or "check stock" or "order". Let's use "order 1 pepsi"
    parseAndForwardSpeech("order 1 pepsi", "customer");
    
    // CV sees pepsi (we just mock it as lays for pricing simplicity, 20rs)
    resetEdgeState();
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); 
    await new Promise(r => setTimeout(r, 200));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); 
    await new Promise(r => setTimeout(r, 200));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); 
    await new Promise(r => setTimeout(r, 1000));
    
    parseAndForwardSpeech("total 30", "owner"); // Spoken 30, CV says 20
    await new Promise(r => setTimeout(r, 3500)); // wait for mismatch timer to expire!

    // ---------------------------------------------------------
    // TEST 3: Speech Before CV (Extreme Delay)
    // ---------------------------------------------------------
    console.log("\n=== TEST 3: Extreme Delay (Speech before CV) ===");
    parseAndForwardSpeech("actually total 40", "owner");
    await new Promise(r => setTimeout(r, 1000));
    parseAndForwardSpeech("give discount 10", "owner"); // Spoken 40, Discount 10.
    
    // Simulate 4s delay
    console.log("\n[DELAY] Simulating 4s CV Delay...");
    await new Promise(r => setTimeout(r, 4000));
    
    resetEdgeState();
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); // Total 20
    await new Promise(r => setTimeout(r, 200));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]);
    await new Promise(r => setTimeout(r, 200));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]);
    
    await new Promise(r => setTimeout(r, 2000));


    // ---------------------------------------------------------
    // TEST 4: Rapid Mixed Inputs (Flicker + Interruption)
    // ---------------------------------------------------------
    console.log("\n=== TEST 4: Rapid Mixed Inputs (Flicker) ===");
    resetEdgeState();
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]);
    parseAndForwardSpeech("total is 40");
    await new Promise(r => setTimeout(r, 100));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); // flicker drop
    parseAndForwardSpeech("wait no");
    await new Promise(r => setTimeout(r, 150));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // recovers
    parseAndForwardSpeech("total is 40 actually");
    await new Promise(r => setTimeout(r, 200));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // recovers fully
    await new Promise(r => setTimeout(r, 2500)); // allow stabilization


    // ---------------------------------------------------------
    // TEST 5: Multi-Intent Overlap
    // ---------------------------------------------------------
    console.log("\n=== TEST 5: Multi-Intent Overlap ===");
    parseAndForwardSpeech("do you have coke");
    await new Promise(r => setTimeout(r, 500));
    parseAndForwardSpeech("no");
    await new Promise(r => setTimeout(r, 500));
    parseAndForwardSpeech("order 10 pepsi");
    await new Promise(r => setTimeout(r, 500));
    parseAndForwardSpeech("total 50");
    await new Promise(r => setTimeout(r, 500));
    parseAndForwardSpeech("discount 5");

    await new Promise(r => setTimeout(r, 3000));


    console.log("\n[Simulator] Tests complete. Shutting down after 2s.");
    setTimeout(() => {
        server.kill();
        process.exit(0);
    }, 2000);
}

simulateAdversarialFusion();
