const express = require("express");
const router = express.Router();
const festivalController = require("../controllers/festivalController");

router.post("/festival-recommendation", festivalController.getFestivalRecommendation);

module.exports = router;
