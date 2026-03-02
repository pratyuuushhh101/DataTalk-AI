# DataTalk-AI: Frontend Integration Guide

This guide outlines the exact API endpoints the frontend application needs to call in order to interact with the DataTalk-AI system.

---

## 1. Database File Uploads (Excel/CSV Support)
The system requires data to be uploaded to Priyanshu's backend before natural language queries can run. **The backend endpoint (http://localhost:5000/upload) strictly accepts .csv files.** 

To provide a seamless experience where the user can upload either Excel (.xlsx) or .csv files:

1. If the user uploads a .csv: Send it directly to http://localhost:5000/upload as multipart/form-data.
2. If the user uploads an Excel (.xlsx) file: You MUST convert it to a .csv blob on the frontend before sending it to the backend.

### Frontend Implementation Detail
You can use the popular xlsx (SheetJS) library on the frontend to instantly convert the file:

import * as XLSX from 'xlsx';

// 1. Read the Excel File
const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

// 2. Convert to CSV String
const csvString = XLSX.utils.sheet_to_csv(worksheet);

// 3. Create a Blob and send to Backend
const csvBlob = new Blob([csvString], { type: 'text/csv' });
const formData = new FormData();
formData.append('file', csvBlob, 'converted_data.csv');

// Send formData to http://localhost:5000/upload

---

## 2. The Two Input Modes
After uploading the data, the end-user has the option to interact with the dashboard in two ways:
1. Text Input: They can manually type their question into a search bar (e.g., "What is the total profit?"). Go directly to Step 4.
2. Voice Input: They can click a microphone icon and ask their question verbally. In this case, go to Step 3 to transcribe the audio into English text first, and then pass that text into Step 4.

---

## 3. Voice Translation Pipeline (Optional)

If your frontend is recording audio directly from the user's microphone, send the raw audio file to this endpoint. The AI Core will automatically detect the spoken language (English, Hindi, Kannada, Bengali, Telugu, Tamil, Marathi, Gujarati, or Malayalam), transcribe it, and translate it into English text.

You can then take that output string and use it as the question payload for the /nl-query endpoint below.

* URL: http://localhost:8000/api/speech
* Method: POST
* Headers: Content-Type: multipart/form-data

### Request Body (Form-Data)
* audio: [The uploaded/recorded audio file Blob, e.g., .wav, .mp3, or .webm]

### Response Example
{
  "text": "Tell me the products and total profit"
}

---

## 4. Natural Language Query & Output (The Main Engine)

This is the primary endpoint. It takes the user's text question, executes the AI-generated SQL query against the database, and returns both the raw data rows and the AI-generated human-readable Markdown insights in multiple languages.

* URL: http://localhost:5000/nl-query
* Method: POST
* Headers: Content-Type: application/json

### Request Body
{
  "question": "What is the total profit for the South region?"
}

### Response Example
{
  "generatedSQL": "SELECT SUM(profit) AS TotalProfit FROM sales_data WHERE region = 'South'",
  "rowsReturned": 1,
  "data": [
    {
      "TotalProfit": 84521
    }
  ],
  "insight": "### Part 1: Insight in English\nThe total profit for the South region is $84,521...\n\n### Part 2: Insight in Hindi\n...\n\n### Part 3: Insight in Bengali\n..."
}

**Frontend Display Instructions:**
1. Use the data array to populate any charts, graphs, or data tables on the screen.
2. Render the insight string inside a Markdown-compatible text box to display the AI's analytical summary directly to the user.

---

## System Architecture Requirements
In order for the frontend to successfully hit these endpoints, the backend developers must have both servers running simultaneously on their local network:
* Priyanshu's Database Server: Running on port 5000 (Handles /nl-query and /upload)
* Pratyush's AI Core (Groq/Llama 3 NLP): Running on port 8000 (Handles /api/speech and inner NLP generation)
