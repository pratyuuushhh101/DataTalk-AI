const { processEvent } = require('./pipeline.service.js');
const { _sessions } = require('./session.service.js');

function simulate(events) {
  console.log("--- STARTING ADVERSARIAL SIMULATION ---\n");
  for (const event of events) {
    console.log(`\nEvent [${event.type}]: ${event.type === 'SPEECH' ? event.text : JSON.stringify(event.items)}`);
    console.log(`Timestamp: ${new Date(event.timestamp).toISOString()}`);
    
    const { session, actions } = processEvent(event);
    
    console.log("-> Actions:", JSON.stringify(actions));
    console.log("-> State:", JSON.stringify({
        spoken: session ? session.spokenTotal : null,
        detected: session ? session.detectedTotal : null,
        discount: session ? session.negotiatedDiscount : null,
        mismatch: session ? (session.mismatchState ? session.mismatchState.active : false) : null,
        lastIntent: session ? session.lastIntent : null,
        intentCount: session ? session.intentHistory.length : 0
    }));
    console.log("-".repeat(40));
  }
}

async function runTest() {
  const baseTime = Date.now();
  const events = [];
  
  // 1. Rapid conflicting updates
  events.push({ eventId: "t1_1", timestamp: baseTime, type: "SPEECH", text: "total 50", speaker: "owner" });
  events.push({ eventId: "t1_2", timestamp: baseTime + 100, type: "SPEECH", text: "no 40", speaker: "owner" });
  events.push({ eventId: "t1_3", timestamp: baseTime + 200, type: "SPEECH", text: "actually 60", speaker: "owner" });
  
  // 2. Delayed CV after speech
  events.push({ eventId: "t2_1", timestamp: baseTime + 2500, type: "CV", items: [{name: "lays", qty: 2}] }); 

  // 3. Repeated speech events
  events.push({ eventId: "t3_1", timestamp: baseTime + 3000, type: "SPEECH", text: "give discount 10", speaker: "customer" });
  events.push({ eventId: "t3_2", timestamp: baseTime + 3500, type: "SPEECH", text: "give discount 10", speaker: "customer" });
  
  // 4. Out-of-order events
  events.push({ eventId: "t4_1", timestamp: baseTime - 10000, type: "SPEECH", text: "give discount 5", speaker: "customer" });

  // 5. Partial/incomplete speech
  events.push({ eventId: "t5_1", timestamp: baseTime + 4000, type: "SPEECH", text: "give dis...", speaker: "customer" });

  // 6. Noise / irrelevant speech
  events.push({ eventId: "t6_1", timestamp: baseTime + 4200, type: "SPEECH", text: "how is the weather", speaker: "customer" });

  // 8. Mixed speaker ambiguity
  events.push({ eventId: "t8_1", timestamp: baseTime + 4500, type: "SPEECH", text: "total 50", speaker: "customer" });
  events.push({ eventId: "t8_2", timestamp: baseTime + 4600, type: "SPEECH", text: "do you have coke", speaker: "owner" });

  simulate(events);

  console.log("\n[⏳] Waiting 2 seconds to trigger Delayed CV mismatch alert...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const delayedResult = processEvent({
      eventId: "t2_2",
      timestamp: Date.now(),
      type: "CV",
      items: [{ name: "lays", qty: 2 }] 
  });
  console.log("-> Delayed Mismatch Actions:", delayedResult.actions);

  // 7. Session timeout behavior
  console.log("\n[⏳] Simulating Session TTL Timeout (jumping 65 seconds)...");
  
  const timeoutEvent = {
      eventId: "t7_1",
      timestamp: Date.now() + 65000,
      type: "SPEECH",
      text: "total 100",
      speaker: "owner"
  };
  
  const timeoutResult = processEvent(timeoutEvent);
  console.log("-> Session successfully reset (intentHistory should be 1):", timeoutResult.session.intentHistory.length === 1);
  console.log("-> New State:", JSON.stringify({
      spoken: timeoutResult.session.spokenTotal,
      intentCount: timeoutResult.session.intentHistory.length
  }));
}

runTest();
