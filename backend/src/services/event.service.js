export async function fetchEvents(location) {
  try {
    const url = `https://serpapi.com/search.json?engine=google_events&q=events in ${location || 'India'}&api_key=${process.env.SERP_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.events_results || [];
  } catch {
    return [];
  }
}

function filterEvents(events) {
  const keywords = ["concert", "match", "festival", "fair"];
  return events.filter(e =>
    keywords.some(k => e.title?.toLowerCase().includes(k))
  );
}

function mapEventsToProducts(events) {
  const mapping = {
    concert: ["cold drinks", "chips"],
    match: ["soft drinks", "biscuits"],
    festival: ["sweets", "snacks"],
    fair: ["water bottles", "snacks"]
  };

  const results = [];

  events.forEach(event => {
    const title = event.title?.toLowerCase() || "";

    Object.keys(mapping).forEach(key => {
      if (title.includes(key)) {
        results.push({
          type: "EVENT_BASED_RECOMMENDATION",
          event: event.title,
          suggested_products: mapping[key]
        });
      }
    });
  });

  return results;
}

export async function getEventRecommendations(location) {
  let events = await fetchEvents(location);

  if (!events.length) {
    events = [
      { title: "Local Cricket Match" },
      { title: "Music Concert" }
    ];
  }

  return mapEventsToProducts(filterEvents(events));
}
