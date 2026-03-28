const festivalService = require("../services/festival.service");

async function getFestivalRecommendation(req, res) {
  try {
    const { festival, inventory } = req.body;
    
    if (!festival || !inventory || !Array.isArray(inventory)) {
      return res.status(400).json({ error: "festival and inventory array are required" });
    }

    const data = await festivalService.generateFestivalRecommendations(festival, inventory);
    res.json(data);
  } catch (error) {
    console.error("Festival Controller Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = { getFestivalRecommendation };
