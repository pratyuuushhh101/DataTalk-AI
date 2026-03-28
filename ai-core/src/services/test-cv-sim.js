const { spawn } = require('child_process');
const { processCVFrameAtEdge, resetEdgeState } = require('./cvStream.service.js');

async function simulateCVPipeline() {
    console.log("--- STARTING API SERVER ---");
    const server = spawn('node', ['api.js']);
    // Filter server logs to just the essentials otherwise output gets too messy
    server.stdout.on('data', data => { if(data.toString().includes('ALERT') || data.toString().includes('Stabilizing')) process.stdout.write("API DBG: " + data) });
    server.stderr.on('data', data => process.stderr.write(data));

    await new Promise(r => setTimeout(r, 1000));

    console.log("\n--- STARTING CV EDGE SIMULATION PHASE 2A.2 ---");

    // SCENARIO 1: Stable New Detection
    console.log("\n=== SCENARIO 1: Stable New Detection (Lays: 1) ===");
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]);
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]);
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); // Should emit on the 3rd consistent frame

    await new Promise(r => setTimeout(r, 2000));

    // SCENARIO 2: Duplicate Frame Handling
    console.log("\n=== SCENARIO 2: Duplicate Suppression (Static Scene) ===");
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]);
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); // Should be suppressed
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); // Should be suppressed

    await new Promise(r => setTimeout(r, 2000));

    // SCENARIO 3: Flickering Item (momentary loss)
    console.log("\n=== SCENARIO 3: Flickering Detection (Momentary Drop) ===");
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // Frame 1: Lays jumps to 2
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 1 }]); // Frame 2: Misses a Lays (Flicker)
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // Frame 3: Recovers to 2
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // Frame 4: Stable at 2
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // Frame 5: Stable at 2 -> EMITS NOW!

    await new Promise(r => setTimeout(r, 2000));

    // SCENARIO 4: Empty Frame Protection (Occlusion)
    console.log("\n=== SCENARIO 4: Empty Frame Protection ===");
    processCVFrameAtEdge([]); // Occulsion 1
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // Recovers immediately!
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); 
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([{ name: "lays", qty: 2 }]); // Stable again, but duplicate so suppressed

    await new Promise(r => setTimeout(r, 2000));

    // SCENARIO 5: Genuine Empty Cart
    console.log("\n=== SCENARIO 5: Genuine Empty Cart ===");
    processCVFrameAtEdge([]); 
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([]); 
    await new Promise(r => setTimeout(r, 500));
    processCVFrameAtEdge([]); // Empty for 3 frames = Emits clearing event!

    
    console.log("\n[Simulator] Tests complete. Shutting down after 2s.");
    setTimeout(() => {
        server.kill();
        process.exit(0);
    }, 2000);
}

simulateCVPipeline();
