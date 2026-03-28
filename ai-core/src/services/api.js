const express = require('express');
const { processEvent } = require('./pipeline.service.js');
const app = express();

app.use(express.json());

app.post('/event', (req, res) => {
    const output = processEvent(req.body);
    res.json(output);
});

app.listen(8000, () => {
    console.log('\n[API] Phase 2A Core Intelligence Layer listening on port 8000');
});
