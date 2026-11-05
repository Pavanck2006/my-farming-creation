import axios from "axios";

const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function getWeather(location) {
  if (!location?.district) return { available: false, reason: "Select a district to request local weather." };
  const queries = [...new Set([location.taluk, location.district].filter(Boolean))];
  let place;
  for (const query of queries) {
    const geo = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
      params: { name: query, count: 10, language: "en", format: "json" }, timeout: 10000
    });
    const results = (geo.data.results || []).filter((item) =>
      item.country_code === "IN" && normalize(item.admin1) === "karnataka"
    );
    place = results.find((item) =>
      normalize(item.admin2) === normalize(location.district) &&
      (!location.taluk || !item.admin3 || normalize(item.admin3) === normalize(location.taluk))
    ) || results.find((item) => normalize(item.admin2) === normalize(location.district));
    if (place) break;
  }
  if (!place) return { available: false, reason: "No weather location was returned for this selection." };
  const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: place.latitude, longitude: place.longitude,
      current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
      timezone: "auto", forecast_days: 7
    }, timeout: 10000
  });
  return { available: true, location: `${place.name}, ${place.admin1 || "Karnataka"}`, source: "Open-Meteo", fetchedAt: new Date().toISOString(), current: response.data.current, daily: response.data.daily };
}
