const STATIC_FESTIVALS = [
  { name: "Holi", date: "2026-03-04" },
  { name: "Eid al-Fitr", date: "2026-05-17" },
  { name: "Raksha Bandhan", date: "2026-08-30" },
  { name: "Navratri", date: "2026-10-09" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Christmas", date: "2026-12-25" }
];

export async function getUpcomingFestival() {
  try {
    const res = await fetch(`https://calendarific.com/api/v2/holidays?api_key=${process.env.CALENDARIFIC_KEY}&country=IN&year=${new Date().getFullYear()}`);
    console.log("Calendar API status:", res.status);

    const data = await res.json();

    if (!data || !data.response || !Array.isArray(data.response.holidays)) {
      throw new Error("Invalid Calendarific response");
    }

    const today = new Date();
    const next14Days = new Date(today);
    next14Days.setDate(today.getDate() + 14);

    let nearestFestival = null;
    let minDiff = Infinity;

    for (const festival of data.response.holidays) {
      if (!festival.date || !festival.date.iso) {
        continue;
      }

      const festDate = new Date(festival.date.iso);
      if (festDate >= today && festDate <= next14Days) {
        const diff = festDate - today;
        if (diff < minDiff) {
          minDiff = diff;
          nearestFestival = {
            name: festival.name,
            date: festival.date.iso,
            days_remaining: Math.ceil(diff / (1000 * 60 * 60 * 24))
          };
        }
      }
    }

    return nearestFestival;
  } catch (error) {
    console.error("Calendar Service Error:", error.message);

    const today = new Date();
    const next14Days = new Date(today);
    next14Days.setDate(today.getDate() + 14);

    let nearestFestival = null;
    let minDiff = Infinity;

    for (const festival of STATIC_FESTIVALS) {
      if (!festival.date) {
        continue;
      }

      const festDate = new Date(festival.date);
      if (festDate >= today && festDate <= next14Days) {
        const diff = festDate - today;
        if (diff < minDiff) {
          minDiff = diff;
          nearestFestival = {
            name: festival.name,
            date: festival.date,
            days_remaining: Math.ceil(diff / (1000 * 60 * 60 * 24))
          };
        }
      }
    }

    return nearestFestival;
  }
}
