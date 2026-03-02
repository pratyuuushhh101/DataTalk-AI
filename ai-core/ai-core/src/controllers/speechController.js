const { transcribeAudio } = require("../services/speechService");
const fs = require("fs");

exports.handleSpeech = async (req, res) => {
  try {
    const filePath = req.file.path;
    const text = await transcribeAudio(filePath);

    fs.unlinkSync(filePath); // delete temp file

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};