const axios = require('axios');
const { spawn } = require('child_process');

console.log("--- STARTING API SERVER ---");
const server = spawn('node', ['api.js']);

server.stdout.on('data', data => process.stdout.write(data));
server.stderr.on('data', data => process.stderr.write(data));

async function sendEventWithDelay(event) {
  const delay = Math.floor(Math.random() * 4000); 
  console.log(`[Simulator] Scheduling API call for [${event.type}] (${event.eventId}) with delay ${delay}ms`);
  
  setTimeout(async () => {
     try {
       await axios.post('http://localhost:8000/event', event);
     } catch (err) {
       console.error(`Error sending ${event.eventId}:`, err.message);
     }
  }, delay);
}

const baseTime = Date.now();

const events = [
  { eventId: "s1", timestamp: baseTime, type: "CV", items: [{name: "lays", qty: 2}] },
  { eventId: "s2", timestamp: baseTime + 100, type: "SPEECH", text: "total 50", speaker: "owner" },
  { eventId: "s3", timestamp: baseTime + 200, type: "SPEECH", text: "actually total 60", speaker: "owner" },
  { eventId: "s4", timestamp: baseTime + 1000, type: "SPEECH", text: "give discount 10", speaker: "customer" },
  { eventId: "s5", timestamp: baseTime + 1100, type: "SPEECH", text: "discount 10", speaker: "customer" },
];

setTimeout(() => {
    console.log("--- STARTING ASYNC API SIMULATOR ---");
    for(const ev of events) {
       sendEventWithDelay(ev);
    }
}, 1000);

// Stop after 6s
setTimeout(() => {
    console.log("\n[Simulator] Finished async streams. Shutting down.");
    server.kill();
    process.exit(0);
}, 6000);
