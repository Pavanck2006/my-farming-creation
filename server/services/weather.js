import axios from "axios";

// Authoritative geographical coordinates for Karnataka districts and primary agricultural centres
export const KARNATAKA_DISTRICT_COORDINATES = {
  "bagalkot": { lat: 16.1817, lon: 75.6958, name: "Bagalkot" },
  "ballari": { lat: 15.1394, lon: 76.9214, name: "Ballari" },
  "bellary": { lat: 15.1394, lon: 76.9214, name: "Ballari" },
  "belagavi": { lat: 15.8521, lon: 74.5045, name: "Belagavi" },
  "belgaum": { lat: 15.8521, lon: 74.5045, name: "Belagavi" },
  "bengaluru rural": { lat: 13.2847, lon: 77.5333, name: "Bengaluru Rural" },
  "bangalore rural": { lat: 13.2847, lon: 77.5333, name: "Bengaluru Rural" },
  "bengaluru urban": { lat: 12.9716, lon: 77.5946, name: "Bengaluru Urban" },
  "bangalore urban": { lat: 12.9716, lon: 77.5946, name: "Bengaluru Urban" },
  "bengaluru": { lat: 12.9716, lon: 77.5946, name: "Bengaluru" },
  "bidar": { lat: 17.9104, lon: 77.5199, name: "Bidar" },
  "chamarajanagar": { lat: 11.9261, lon: 76.9437, name: "Chamarajanagar" },
  "chikkaballapur": { lat: 13.4325, lon: 77.7275, name: "Chikkaballapur" },
  "chikkamagaluru": { lat: 13.3161, lon: 75.7720, name: "Chikkamagaluru" },
  "chikmagalur": { lat: 13.3161, lon: 75.7720, name: "Chikkamagaluru" },
  "chitradurga": { lat: 14.2251, lon: 76.3980, name: "Chitradurga" },
  "dakshina kannada": { lat: 12.8703, lon: 74.8806, name: "Mangaluru, Dakshina Kannada" },
  "mangaluru": { lat: 12.9141, lon: 74.8560, name: "Mangaluru" },
  "davanagere": { lat: 14.4644, lon: 75.9218, name: "Davanagere" },
  "dharwad": { lat: 15.4589, lon: 75.0078, name: "Dharwad" },
  "hubballi": { lat: 15.3647, lon: 75.1240, name: "Hubballi" },
  "gadag": { lat: 15.4319, lon: 75.6358, name: "Gadag" },
  "hassan": { lat: 13.0033, lon: 76.1004, name: "Hassan" },
  "haveri": { lat: 14.7958, lon: 75.3991, name: "Haveri" },
  "kalaburagi": { lat: 17.3297, lon: 76.8343, name: "Kalaburagi" },
  "gulbarga": { lat: 17.3297, lon: 76.8343, name: "Kalaburagi" },
  "kodagu": { lat: 12.3375, lon: 75.8069, name: "Madikeri, Kodagu" },
  "madikeri": { lat: 12.4244, lon: 75.7382, name: "Madikeri" },
  "kolar": { lat: 13.1367, lon: 78.1291, name: "Kolar" },
  "koppal": { lat: 15.3456, lon: 76.1552, name: "Koppal" },
  "mandya": { lat: 12.5223, lon: 76.8975, name: "Mandya" },
  "malavalli": { lat: 12.3856, lon: 77.0605, name: "Malavalli, Mandya" },
  "maddur": { lat: 12.5841, lon: 77.0453, name: "Maddur, Mandya" },
  "pandavapura": { lat: 12.4965, lon: 76.6698, name: "Pandavapura, Mandya" },
  "srirangapatna": { lat: 12.4238, lon: 76.6953, name: "Srirangapatna, Mandya" },
  "mysuru": { lat: 12.2958, lon: 76.6394, name: "Mysuru" },
  "mysore": { lat: 12.2958, lon: 76.6394, name: "Mysuru" },
  "raichur": { lat: 16.2120, lon: 77.3439, name: "Raichur" },
  "ramanagara": { lat: 12.7209, lon: 77.2799, name: "Ramanagara" },
  "channapatna": { lat: 12.6517, lon: 77.2062, name: "Channapatna, Ramanagara" },
  "shivamogga": { lat: 13.9299, lon: 75.5681, name: "Shivamogga" },
  "shimoga": { lat: 13.9299, lon: 75.5681, name: "Shivamogga" },
  "tumakuru": { lat: 13.3409, lon: 77.1010, name: "Tumakuru" },
  "tumkur": { lat: 13.3409, lon: 77.1010, name: "Tumakuru" },
  "udupi": { lat: 13.3409, lon: 74.7421, name: "Udupi" },
  "uttara kannada": { lat: 14.8185, lon: 74.1416, name: "Karwar, Uttara Kannada" },
  "karwar": { lat: 14.8185, lon: 74.1416, name: "Karwar" },
  "vijayanagara": { lat: 15.2689, lon: 76.3909, name: "Hospet, Vijayanagara" },
  "hospet": { lat: 15.2689, lon: 76.3909, name: "Hospet" },
  "vijayapura": { lat: 16.8302, lon: 75.7100, name: "Vijayapura" },
  "bijapur": { lat: 16.8302, lon: 75.7100, name: "Vijayapura" },
  "yadgir": { lat: 16.7621, lon: 77.1442, name: "Yadgir" }
};

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Convert location string/object to coordinates
export async function geocodeLocation(district, taluk = "") {
  const normTaluk = normalize(taluk);
  const normDistrict = normalize(district);

  // 1. Direct match in Karnataka coordinates table
  if (normTaluk && KARNATAKA_DISTRICT_COORDINATES[normTaluk]) {
    const loc = KARNATAKA_DISTRICT_COORDINATES[normTaluk];
    return { lat: loc.lat, lon: loc.lon, displayName: `${loc.name}, Karnataka` };
  }
  if (normDistrict && KARNATAKA_DISTRICT_COORDINATES[normDistrict]) {
    const loc = KARNATAKA_DISTRICT_COORDINATES[normDistrict];
    const name = taluk ? `${taluk}, ${loc.name}` : `${loc.name}, Karnataka`;
    return { lat: loc.lat, lon: loc.lon, displayName: name };
  }

  // 2. Try Open-Meteo Geocoding API with multi-query strategy
  const queries = [
    taluk && district ? `${taluk}, ${district}` : null,
    taluk ? `${taluk}, Karnataka` : null,
    district ? `${district}, Karnataka` : null,
    taluk,
    district
  ].filter(Boolean);

  for (const query of queries) {
    try {
      const geo = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
        params: { name: query, count: 5, language: "en", format: "json" },
        timeout: 6000
      });
      const results = geo.data?.results || [];
      // Prefer results in Karnataka or India
      const karnatakaMatch = results.find(
        (item) => item.country_code === "IN" && normalize(item.admin1).includes("karnataka")
      );
      if (karnatakaMatch) {
        return {
          lat: karnatakaMatch.latitude,
          lon: karnatakaMatch.longitude,
          displayName: `${karnatakaMatch.name}, ${karnatakaMatch.admin2 || karnatakaMatch.admin1 || "Karnataka"}`
        };
      }
      const indiaMatch = results.find((item) => item.country_code === "IN");
      if (indiaMatch) {
        return {
          lat: indiaMatch.latitude,
          lon: indiaMatch.longitude,
          displayName: `${indiaMatch.name}, ${indiaMatch.admin1 || "India"}`
        };
      }
    } catch (err) {
      // Continue to next query or fallback
    }
  }

  // 3. Fallback: Default to central Karnataka if valid district name but unlocated
  return {
    lat: 14.4644,
    lon: 75.9218,
    displayName: `${taluk ? taluk + ", " : ""}${district || "Karnataka"}`
  };
}

export async function getWeather(location) {
  if (!location?.district && !location?.taluk) {
    return {
      available: false,
      reason: "Please select your district and taluk in your Farm Profile to view live local weather."
    };
  }

  try {
    const geo = await geocodeLocation(location.district, location.taluk);

    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: geo.lat,
        longitude: geo.lon,
        current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,apparent_temperature",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
        hourly: "temperature_2m,precipitation_probability",
        timezone: "auto",
        forecast_days: 7
      },
      timeout: 9000
    });

    const current = response.data.current;
    const daily = response.data.daily;

    // Derived analysis: expected rainfall and temperature trends
    const totalWeeklyRain = daily.precipitation_sum?.reduce((a, b) => a + (b || 0), 0) || 0;
    const maxRainChance = Math.max(...(daily.precipitation_probability_max || [0]));
    const rainyDaysCount = daily.precipitation_sum?.filter((p) => p > 1).length || 0;

    const todayMaxTemp = daily.temperature_2m_max?.[0] ?? current.temperature_2m;
    const weekAvgMaxTemp = daily.temperature_2m_max?.length
      ? Math.round(daily.temperature_2m_max.reduce((a, b) => a + b, 0) / daily.temperature_2m_max.length)
      : todayMaxTemp;

    const tempChange = Math.round((daily.temperature_2m_max?.[1] ?? todayMaxTemp) - todayMaxTemp);

    const rainAlert =
      totalWeeklyRain > 25
        ? "Heavy rain expected this week. Delay pesticide application and check field drainage."
        : totalWeeklyRain > 5
          ? "Moderate rain showers forecasted. Suitable for land preparation and sowing."
          : "Dry conditions expected. Ensure adequate irrigation planning for standing crops.";

    const tempTrend =
      tempChange > 2
        ? `Warming trend: temperatures rising by ~${tempChange}°C over the next 24-48 hours.`
        : tempChange < -2
          ? `Cooling trend: temperatures dropping by ~${Math.abs(tempChange)}°C.`
          : "Stable temperatures expected over the next few days.";

    return {
      available: true,
      source: "Open-Meteo Weather API",
      location: geo.displayName,
      coordinates: { lat: geo.lat, lon: geo.lon },
      fetchedAt: new Date().toISOString(),
      current: {
        temperature_2m: current.temperature_2m,
        apparent_temperature: current.apparent_temperature ?? current.temperature_2m,
        relative_humidity_2m: current.relative_humidity_2m,
        precipitation: current.precipitation ?? 0,
        wind_speed_10m: current.wind_speed_10m,
        weather_code: current.weather_code
      },
      daily: {
        time: daily.time,
        temperature_2m_max: daily.temperature_2m_max,
        temperature_2m_min: daily.temperature_2m_min,
        precipitation_sum: daily.precipitation_sum,
        precipitation_probability_max: daily.precipitation_probability_max,
        wind_speed_10m_max: daily.wind_speed_10m_max,
        weather_code: daily.weather_code
      },
      summary: {
        totalWeeklyRain: Number(totalWeeklyRain.toFixed(1)),
        maxRainChance,
        rainyDaysCount,
        weekAvgMaxTemp,
        tempChange,
        rainAlert,
        tempTrend
      }
    };
  } catch (error) {
    return {
      available: false,
      reason: `Could not retrieve live weather from Open-Meteo (${error.message}). Please check your internet connection or retry in a few moments.`
    };
  }
}
