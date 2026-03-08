const express = require("express");
const multer = require("multer");
const { handleSpeech } = require("../controllers/speechController");

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/speech", upload.single("audio"), handleSpeech);

module.exports = router;