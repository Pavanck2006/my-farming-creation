import axios from "axios";
import { getMarketPrices } from "./market.js";
import { crops } from "../data/crops.js";

const isLocalAIUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
};

export function getAssistantAIStatus() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const aiUrl = process.env.AI_API_URL;
  const hasConfiguredCompatibleAI = Boolean(
    aiUrl && (process.env.AI_API_KEY || process.env.OPENAI_API_KEY || isLocalAIUrl(aiUrl))
  );
  return {
    available: hasGemini || hasConfiguredCompatibleAI,
    provider: hasGemini ? "Gemini" : hasConfiguredCompatibleAI ? (isLocalAIUrl(aiUrl) ? "local model" : "AI provider") : null
  };
}

const buildSystemPrompt = (context) => `
You are Namma Krishi AI (ನಮ್ಮ ಕೃಷಿ AI), an empathetic, knowledgeable, and reliable agricultural assistant built for farmers.
Language: Detect the language of the farmer's latest message and reply in that same language and writing system. Support the language the farmer uses rather than limiting replies to the app's English/Kannada interface. If the farmer explicitly asks for another language, use it. For mixed-language messages, reply in the dominant language. Keep the answer clear and practical.
Formatting: Use readable plain text, short paragraphs, and numbered steps. Do not output Markdown heading, bold, or italic markers.
Farmer Profile & Farm Context:
- Location: ${context.taluk ? `${context.taluk}, ` : ""}${context.district || "Karnataka"}
- Soil Type: ${context.soils?.join(", ") || "General arable soil"}
- Water Availability: ${context.waterAvailability || "Moderate"}
- Current Season: ${context.season || "Kharif"}
- Weather: ${JSON.stringify(context.weather || {})}

Guidelines:
1. Provide accurate, practical farming advice covering crop selection, weather adaptation, market prices, yield & profit calculations, and integrated pest protection.
2. Never invent live market prices, weather observations, dates, sources, or facts. Clearly identify estimates and advise checking local sources when verified data is unavailable.
3. For yield and profit calculations, always emphasize the formulas:
   - Gross Revenue = Expected Yield (q/acre) × Market Price (₹/q)
   - Estimated Net Profit = Gross Revenue − Cultivation Cost (₹/acre)
   Remind the farmer that these are model estimates and never guaranteed.
4. For pest control, recommend Integrated Pest Management (IPM), including field sanitation, organic neem oil (Azadirachtin), pheromone traps, and advise consulting the nearest Raitha Samparka Kendra (RSK) / KVK. Do not provide pesticide doses unless verified for the specific crop and region; direct the farmer to the product label and local agricultural expert.
5. Keep the tone respectful, clear, and encouraging for farmers.
`;

export async function answerAssistant(message, context = {}) {
  const isKannada = context.language === "kn" || /[\u0C80-\u0CFF]/.test(message);
  const q = (message || "").toLowerCase();

  // 1. Check for Gemini API or OpenAI / external LLM API
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const aiUrl = process.env.AI_API_URL;
  const recentHistory = (Array.isArray(context.chatHistory) ? context.chatHistory : [])
    .filter((entry) => ["user", "assistant"].includes(entry?.role) && typeof entry.content === "string")
    .slice(-10);

  // Try Gemini API if key is present
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const payload = {
        systemInstruction: { parts: [{ text: buildSystemPrompt(context) }] },
        contents: [
          ...recentHistory.map(({ role, content }) => ({
            role: role === "assistant" ? "model" : "user",
            parts: [{ text: content }]
          })),
          { role: "user", parts: [{ text: message }] }
        ]
      };
      const response = await axios.post(url, payload, { timeout: 15000 });
      const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return { text: reply, mode: "ai", provider: "Gemini 1.5 Flash" };
    } catch (err) {
      console.warn("Gemini API call failed, falling back to Namma Krishi Engine:", err.message);
    }
  }

  // Try OpenAI-compatible API if configured
  if (aiUrl && (openaiKey || isLocalAIUrl(aiUrl))) {
    try {
      const response = await axios.post(
        aiUrl,
        {
          model: process.env.AI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: buildSystemPrompt(context) },
            ...recentHistory,
            { role: "user", content: message }
          ]
        },
        {
          headers: openaiKey ? { Authorization: `Bearer ${openaiKey}` } : {},
          timeout: 30000,
          proxy: isLocalAIUrl(aiUrl) ? false : undefined
        }
      );
      const content = response.data.choices?.[0]?.message?.content;
      if (content) return { text: content, mode: "ai", provider: process.env.AI_MODEL || "LLM" };
    } catch (err) {
      console.warn("External AI API failed, falling back to Namma Krishi Engine:", err.message);
    }
  }

  // 2. Intelligent, Comprehensive Agricultural Engine for Namma Krishi
  const district = context.district || "your district";
  const soils = context.soils?.length ? context.soils.join(", ") : "red/loamy soil";
  const water = context.waterAvailability || "medium";

  // Intent A: Yield & Profit Calculation
  if (q.includes("profit") || q.includes("yield") || q.includes("cost") || q.includes("revenue") || q.includes("ಲಾಭ") || q.includes("ಇಳುವರಿ") || q.includes("ವೆಚ್ಚ") || q.includes("ಲೆಕ್ಕ")) {
    if (isKannada) {
      return {
        text: `📊 **ಬೆಳೆ ಇಳುವರಿ ಮತ್ತು ನಿವ್ವಳ ಲಾಭ ಲೆಕ್ಕಾಚಾರದ ಸೂತ್ರಗಳು:**\n\n` +
              `1. **ಒಟ್ಟು ಆದಾಯ (Gross Revenue)** = ನಿರೀಕ್ಷಿತ ಇಳುವರಿ (ಕ್ವಿಂಟಾಲ್/ಎಕರೆ) × ಮಾರುಕಟ್ಟೆ ಬೆಲೆ (₹/ಕ್ವಿಂಟಾಲ್)\n` +
              `2. **ನಿವ್ವಳ ಲಾಭ (Net Profit)** = ಒಟ್ಟು ಆದಾಯ − ಸಾಗುವಳಿ ವೆಚ್ಚ (₹/ಎಕರೆ)\n\n` +
              `🌾 **ಅಂದಾಜುಗಳ ಕುರಿತು:**\n` +
              `ಇಳುವರಿ ಮತ್ತು ಸಾಗುವಳಿ ವೆಚ್ಚವು ಸ್ಥಳೀಯ ಪರಿಸ್ಥಿತಿಗಳ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿರುತ್ತದೆ. ಮಾರುಕಟ್ಟೆ ಪುಟದ ಬೆಲೆಗಳು ಯೋಜನಾ ಅಂದಾಜುಗಳು ಮಾತ್ರ; ಇಂದಿನ ಮಾರಾಟದ ದರಕ್ಕಾಗಿ ಸ್ಥಳೀಯ APMC ಅನ್ನು ಸಂಪರ್ಕಿಸಿ.\n\n` +
              `⚠️ *ಇಳುವರಿ ಮತ್ತು ಲಾಭದ ಅಂದಾಜುಗಳು ಖಾತರಿಯಲ್ಲ. ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.*`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `📊 **Crop Yield and Net Profit Calculation Formulas:**\n\n` +
            `1. **Gross Revenue** = Expected Yield (quintals/acre) × Market Price (₹/quintal)\n` +
            `2. **Estimated Net Profit** = Gross Revenue − Cultivation Cost (₹/acre)\n\n` +
            `🌾 **About estimates:**\n` +
            `Yield and cultivation costs depend on local conditions. Prices on the Market page are planning assumptions only, not current market quotes. Contact your local APMC for today's rate.\n\n` +
            `💡 *Use the crop planner's profit calculator with a current local market quote. Estimates are not guaranteed.*`,
      mode: "knowledge-engine"
    };
  }

  // Intent B: Market Prices & Mandi Rates
  if (q.includes("market") || q.includes("mandi") || q.includes("price") || q.includes("rate") || q.includes("ಬೆಲೆ") || q.includes("ದರ") || q.includes("ಮಾರುಕಟ್ಟೆ") || q.includes("ಮಂಡಿ")) {
    const marketData = await getMarketPrices({ district: context.district });
    const quotes = marketData.prices.slice(0, 5).map((record) =>
      marketData.isEstimate
        ? `• **${record.crop}** — illustrative reference ₹${record.modalPrice.toLocaleString("en-IN")}/q (planning range ₹${record.minPrice.toLocaleString("en-IN")}–₹${record.maxPrice.toLocaleString("en-IN")}/q).`
        : `• **${record.crop}** — ${record.market}, ${record.district}: modal ₹${record.modalPrice.toLocaleString("en-IN")}/q (min ₹${record.minPrice.toLocaleString("en-IN")}, max ₹${record.maxPrice.toLocaleString("en-IN")}); date ${record.date}.`
    );
    const recordsText = quotes.length
      ? `${quotes.join("\n")}\n\nSource: ${marketData.source}. ${marketData.isEstimate ? marketData.reason : marketData.isCached ? "Cached official records (not a live refresh)." : "Retrieved from the official feed."}`
      : `No ${marketData.isEstimate ? "planning estimates" : "verified market prices"} are available for ${context.district || "Karnataka"} right now. ${marketData.reason}`;

    if (isKannada) {
      return {
        text: `🛒 **ಬೆಳೆ ಬೆಲೆ ಮಾಹಿತಿ:**\n\n${recordsText}\n\n` +
              `${marketData.isEstimate ? "📍 ಮಾರಾಟಕ್ಕೂ ಮೊದಲು ಸ್ಥಳೀಯ APMC ಯಲ್ಲಿ ಇಂದಿನ ದರ ಪರಿಶೀಲಿಸಿ." : "📍 ಮಾರಾಟದ ನಿರ್ಧಾರಕ್ಕೂ ಮೊದಲು ಮಂಡಿ ಮತ್ತು ದಿನಾಂಕವನ್ನು ಪರಿಶೀಲಿಸಿ."}`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `🛒 **${marketData.isEstimate ? "Crop price planning references" : `Market prices for ${context.district || "Karnataka"}`}:**\n\n${recordsText}\n\n` +
            `${marketData.isEstimate ? "Check today's rate with your local APMC before making a selling decision." : "Check the market and date before making a selling decision."}`,
      mode: "knowledge-engine"
    };
  }

  // Intent C: Weather & Sowing Conditions
  if (q.includes("weather") || q.includes("rain") || q.includes("temp") || q.includes("forecast") || q.includes("climate") || q.includes("ಹವಾಮಾನ") || q.includes("ಮಳೆ") || q.includes("ಬಿಸಿಲು") || q.includes("ಗಾಳಿ")) {
    const w = context.weather;
    const temp = w?.current?.temperature_2m ? `${Math.round(w.current.temperature_2m)}°C` : "moderate";
    const rain = w?.current?.precipitation !== undefined ? `${w.current.precipitation} mm` : "nil";
    const weeklyRain = w?.summary?.totalWeeklyRain !== undefined ? `${w.summary.totalWeeklyRain} mm` : "expected seasonal rain";

    if (isKannada) {
      return {
        text: `🌤️ **${district} ಭಾಗದ ಹವಾಮಾನ ಸಲಹೆ:**\n\n` +
              `• **ಪ್ರಸ್ತುತ ತಾಪಮಾನ:** ${temp}, ಇಂದಿನ ಮಳೆ: ${rain}.\n` +
              `• **ಮುಂದಿನ 7 ದಿನಗಳ ಅಂದಾಜು ಮಳೆ:** ಸುಮಾರು ${weeklyRain}.\n` +
              `• **ಕೃಷಿ ಸಲಹೆ:** ${w?.summary?.rainAlert || "ಮಣ್ಣಿನಲ್ಲಿ ಸೂಕ್ತ ತೇವಾಂಶವಿದ್ದಾಗ ಮಾತ್ರ ಬಿತ್ತನೆ ಕೈಗೊಳ್ಳಿ. ಭಾರಿ ಮಳೆಯ ಮುನ್ಸೂಚನೆ ಇದ್ದರೆ ರಸಗೊಬ್ಬರ ಮತ್ತು ಕೀಟನಾಶಕ ಸಿಂಪಡಣೆಯನ್ನು ಮುಂದೂಡಿ."}\n\n` +
              `🌦️ ಸಂಪೂರ್ಣ 7 ದಿನಗಳ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆಗಾಗಿ 'ಹವಾಮಾನ' (Weather) ಟ್ಯಾಬ್ ಪರಿಶೀಲಿಸಿ.`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `🌤️ **Live Weather & Agronomy Advisory for ${district}:**\n\n` +
            `• **Current Observation:** Temperature is ${temp}, rainfall currently at ${rain}.\n` +
            `• **7-Day Outlook:** Total rainfall of ~${weeklyRain} expected over the next week.\n` +
            `• **Actionable Advice:** ${w?.summary?.rainAlert || "Sow only when adequate seedbed moisture is reached. Avoid spraying foliar fertilizers or pesticides ahead of forecasted rain."}\n\n` +
            `🌦️ Visit the **Weather** tab to view the day-by-day hourly forecast, rain probabilities, and wind speeds.`,
      mode: "knowledge-engine"
    };
  }

  // Intent D: Pest & Disease Protection
  if (q.includes("pest") || q.includes("disease") || q.includes("worm") || q.includes("insect") || q.includes("fungus") || q.includes("blight") || q.includes("ಕೀಟ") || q.includes("ರೋಗ") || q.includes("ಹುಳು") || q.includes("ಔಷಧಿ")) {
    if (q.includes("maize") || q.includes("corn") || q.includes("ಮುಸುಕಿನ ಜೋಳ") || q.includes("ಜೋಳ")) {
      if (isKannada) {
        return {
          text: `🐛 **ಮುಸುಕಿನ ಜೋಳದ ಸೈನಿಕ ಹುಳು (Fall Armyworm) ನಿಯಂತ್ರಣ ಕ್ರಮಗಳು:**\n\n` +
                `1. **ಹೊಲ ಪರಿಶೀಲನೆ:** ಗಿಡಗಳ ಸುಳಿಯಲ್ಲಿನ ಹಾನಿ ಮತ್ತು ಹುಳುಗಳ ಲಕ್ಷಣಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಗಮನಿಸಿ.\n` +
                `2. **ಸಮಗ್ರ ನಿರ್ವಹಣೆ:** ಸೋಂಕಿತ ಭಾಗಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ತೆಗೆದುಹಾಕಿ; ನಿಮ್ಮ ಬೆಳೆಗೆ ಸೂಕ್ತವಾದ ಬಲೆ ಅಥವಾ ಜೈವಿಕ ನಿಯಂತ್ರಣದ ಬಗ್ಗೆ RSK/KVK ಸಲಹೆ ಪಡೆಯಿರಿ.\n` +
                `3. **ತೀವ್ರ ಬಾಧೆ ಇದ್ದಲ್ಲಿ:** ಕೀಟವನ್ನು ತಜ್ಞರಿಂದ ಗುರುತಿಸಿ, ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ನೋಂದಾಯಿತ ಚಿಕಿತ್ಸೆಯನ್ನಷ್ಟೇ ಉತ್ಪನ್ನದ ಲೇಬಲ್ ಪ್ರಕಾರ ಬಳಸಿ.\n\n` +
                `⚠️ *ಲೇಬಲ್ ಸೂಚನೆಗಳನ್ನು ಪಾಲಿಸಿ; ಔಷಧಿ ಮಿಶ್ರಣ ಅಥವಾ ಪ್ರಮಾಣವನ್ನು ಊಹಿಸಬೇಡಿ. ಸ್ಥಳೀಯ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರವನ್ನು (RSK) ಸಂಪರ್ಕಿಸಿ.*`,
          mode: "knowledge-engine"
        };
      }
      return {
        text: `🐛 **Maize Fall Armyworm (FAW) Integrated Pest Management:**\n\n` +
              `1. **Field scouting:** Regularly inspect the plant whorls for feeding damage and larvae.\n` +
              `2. **Integrated management:** Remove and safely dispose of heavily affected plant parts; ask your RSK/KVK about crop-appropriate traps and biological controls.\n` +
              `3. **Severe infestation:** Have the pest identified by an agricultural expert and use only a treatment registered for your crop and region, exactly as its label directs.\n\n` +
              `⚠️ *Do not guess or mix pesticide doses. Follow the product label and consult your local Krishi Vigyan Kendra (KVK).*`,
        mode: "knowledge-engine"
      };
    }

    if (q.includes("paddy") || q.includes("rice") || q.includes("ಭತ್ತ")) {
      if (isKannada) {
        return {
          text: `🌾 **ಭತ್ತದ ಬೆಳೆಯ ಕಾಂಡ ಕೊರೆಯುವ ಹುಳು ಮತ್ತು ಬೆಂಕಿ ರೋಗ (Blast) ನಿರ್ವಹಣೆ:**\n\n` +
                `1. **ಕಾಂಡ ಕೊರೆಯುವ ಹುಳು:** ಹೊಲವನ್ನು ನಿಯಮಿತವಾಗಿ ಪರಿಶೀಲಿಸಿ; ಬೆಳೆಗೆ ಸೂಕ್ತವಾದ ಬಲೆ ಅಥವಾ ಜೈವಿಕ ನಿಯಂತ್ರಣದ ಬಗ್ಗೆ RSK/KVK ಸಲಹೆ ಪಡೆಯಿರಿ.\n` +
                `2. **ಬೆಂಕಿ ರೋಗದ ಲಕ್ಷಣಗಳು:** ಸೋಂಕಿತ ಸಸ್ಯ ಭಾಗಗಳನ್ನು ಗುರುತಿಸಿ, ಹೊಲದಲ್ಲಿ ನೀರು ಬಸಿದು ಹೋಗುವಂತೆ ನೋಡಿಕೊಳ್ಳಿ ಮತ್ತು ರೋಗದ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕೃಷಿ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ.\n` +
                `3. ಯಾವುದೇ ಚಿಕಿತ್ಸೆ ಬಳಸುವ ಮೊದಲು ಅದು ಭತ್ತ ಮತ್ತು ನಿಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ ನೋಂದಾಯಿತವೇ ಎಂದು ಪರಿಶೀಲಿಸಿ; ಉತ್ಪನ್ನದ ಲೇಬಲ್ ಪಾಲಿಸಿ.`,
          mode: "knowledge-engine"
        };
      }
      return {
        text: `🌾 **Paddy Stem Borer & Blast Disease Management:**\n\n` +
              `1. **Stem borer:** Scout fields regularly and ask your RSK/KVK about crop-appropriate traps or biological controls.\n` +
              `2. **Possible blast symptoms:** Confirm the diagnosis with an agricultural expert, avoid excessive nitrogen, and maintain proper field drainage.\n` +
              `3. Before any treatment, verify that it is registered for paddy in your region and follow its product label exactly.`,
        mode: "knowledge-engine"
      };
    }

    if (isKannada) {
      return {
        text: `🛡️ **ಸಮಗ್ರ ಕೀಟ ಮತ್ತು ರೋಗ ನಿರ್ವಹಣೆ (IPM) ಸೂತ್ರಗಳು:**\n\n` +
              `1. **ಹೊಲ ಪರಿಶೀಲನೆ:** ಕೀಟ ಅಥವಾ ರೋಗದ ಲಕ್ಷಣಗಳನ್ನು ದಾಖಲಿಸಿ; ಸಾಧ್ಯವಾದರೆ ಸ್ಪಷ್ಟ ಚಿತ್ರ ತೆಗೆದುಕೊಳ್ಳಿ.\n` +
              `2. **ಸಮಗ್ರ ನಿರ್ವಹಣೆ:** ಹೊಲವನ್ನು ಸ್ವಚ್ಛವಾಗಿಡಿ ಮತ್ತು ಬೆಳೆ/ಕೀಟಕ್ಕೆ ಸೂಕ್ತವಾದ ಬಲೆ ಅಥವಾ ಜೈವಿಕ ನಿಯಂತ್ರಣದ ಬಗ್ಗೆ ಸ್ಥಳೀಯ ತಜ್ಞರನ್ನು ಕೇಳಿ.\n` +
              `3. **ಚಿಕಿತ್ಸೆ:** ಉತ್ಪನ್ನದ ಲೇಬಲ್ ಮತ್ತು RSK/KVK ಸಲಹೆಯಿಲ್ಲದೆ ಕೀಟನಾಶಕ ಅಥವಾ ಮಿಶ್ರಣ ಬಳಸಬೇಡಿ.\n` +
              `4. ಬೆಳೆಯ ಹೆಸರು ಮತ್ತು ಕಾಣುವ ಲಕ್ಷಣಗಳನ್ನು ತಿಳಿಸಿ; ಮುಂದಿನ ಸುರಕ್ಷಿತ ಕ್ರಮಗಳನ್ನು ಸೂಚಿಸುತ್ತೇನೆ.`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `🛡️ **Integrated Pest & Disease Management (IPM) Guidelines:**\n\n` +
      `1. **Field scouting:** Record visible symptoms and, if possible, take a clear photo for diagnosis.\n` +
      `2. **Integrated management:** Maintain field sanitation and ask your local RSK/KVK which crop-appropriate traps or biological controls are suitable.\n` +
      `3. **Treatment:** Do not guess pesticide doses or mixes. Use only a product registered for the crop and region, following its label and expert advice.\n` +
      `4. Tell me the crop and symptoms so I can suggest safe next steps.`,
      mode: "knowledge-engine"
    };
  }

  // Intent E: Crop Selection & Suitability
  if (q.includes("crop") || q.includes("grow") || q.includes("select") || q.includes("recommend") || q.includes("soil") || q.includes("water") || q.includes("ಬೆಳೆ") || q.includes("ಮಣ್ಣು") || q.includes("ಆಯ್ಕೆ")) {
    if (isKannada) {
      return {
        text: `🌱 **${district} ಭಾಗಕ್ಕೆ ಸೂಕ್ತ ಬೆಳೆಗಳ ಶಿಫಾರಸು (ಮಣ್ಣು: ${soils}, ನೀರು: ${water}):**\n\n` +
              `1. **ರಾಗಿ (Ragi - GPU-28, ML-365):** ಕಡಿಮೆ ನೀರಿನಲ್ಲೂ ಬೆಳೆಯಬಲ್ಲ ಪೌಷ್ಟಿಕ ಬೆಳೆ. ನಿಮ್ಮ ಮಣ್ಣು ಮತ್ತು ಸ್ಥಳೀಯ ಪರಿಸ್ಥಿತಿಗೆ ಹೊಂದಿಕೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.\n` +
              `2. **ಮುಸುಕಿನ ಜೋಳ (Maize):** ಮಧ್ಯಮ ನೀರಿನ ಲಭ್ಯತೆ ಇದ್ದರೆ ಪರಿಗಣಿಸಬಹುದಾದ ಬೆಳೆ; ನಿಜವಾದ ಇಳುವರಿ ಸ್ಥಳೀಯ ಪರಿಸ್ಥಿತಿಗಳ ಮೇಲೆ ಅವಲಂಬಿತ.\n` +
              `3. **ಕಡಲೆಕಾಯಿ (Groundnut):** ಎಣ್ಣೆಕಾಳು ಬೆಳೆಯಾಗಿದ್ದು ದ್ವಿದಳ ಧಾನ್ಯದಂತೆ ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಹೆಚ್ಚಿಸುತ್ತದೆ. ಮರಳು-ಗೋಡು ಮಣ್ಣಿಗೆ ಅತ್ಯುತ್ತಮ.\n` +
              `4. **ತೊಗರಿ / ದ್ವಿದಳ ಧಾನ್ಯಗಳು:** ಕಡಿಮೆ ನೀರಿನ ಅಗತ್ಯವಿರುವ ಆಯ್ಕೆಗಳು; ಮಾರಾಟದ ಮೊದಲು ಇಂದಿನ APMC ದರ ಪರಿಶೀಲಿಸಿ.\n\n` +
              `👉 ಸಂಪೂರ್ಣ ವೈಜ್ಞಾನಿಕ ಸ್ಕೋರ್ ಮತ್ತು ಬೆಳೆ ಹೋಲಿಕೆಗಾಗಿ 'ಬೆಳೆ ಯೋಜನೆ' (Crop Planner) ಪುಟಕ್ಕೆ ಭೇಟಿ ನೀಡಿ!`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `🌱 **Top Recommended Crops for ${district} (${soils}, ${water} water availability):**\n\n` +
            `1. **Ragi (Finger Millet - GPU-28, ML-365):** A drought-tolerant option for suitable red/loamy soils. Yield and returns depend on local conditions and current selling prices.\n` +
            `2. **Maize (High-Yield Hybrids):** Consider where moderate irrigation and good drainage are available; actual yield varies by farm.\n` +
            `3. **Groundnut (TMV-2, JL-24):** An oilseed option for suitable soils; confirm local suitability and today's APMC price.\n` +
            `4. **Tur (Pigeon Pea) / Pulses:** Lower-water options to consider; check current local prices before making a selling decision.\n\n` +
            `👉 Navigate to **Crop Planner** in your sidebar to see real-time suitability percentages and compare crops side by side!`,
      mode: "knowledge-engine"
    };
  }

  // Fallback: Warm, helpful agricultural response
  if (isKannada) {
    return {
      text: `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ 'ನಮ್ಮ ಕೃಷಿ' ಡಿಜಿಟಲ್ ಕೃಷಿ ಸಹಾಯಕ. 🌾\n\n` +
            `ನೀವು ನನ್ನನ್ನು ಈ ವಿಷಯಗಳ ಬಗ್ಗೆ ಕೇಳಬಹುದು:\n` +
            `• **ಬೆಳೆ ಆಯ್ಕೆ:** ನಿಮ್ಮ ಮಣ್ಣು ಮತ್ತು ನೀರಿಗೆ ಯಾವ ಬೆಳೆ ಉತ್ತಮ?\n` +
            `• **ಹವಾಮಾನ ಸಲಹೆ:** ಇಂದಿನ ಮತ್ತು ಮುಂದಿನ ವಾರದ ಮಳೆ, ತಾಪಮಾನ.\n` +
            `• **ಮಾರುಕಟ್ಟೆ ಧಾರಣೆ:** ರಾಗಿ, ಮೆಕ್ಕೆಜೋಳ, ಟೊಮೆಟೊ ಮುಂತಾದ ಮಂಡಿ ಬೆಲೆಗಳು.\n` +
            `• **ಲಾಭ ಮತ್ತು ಇಳುವರಿ:** ಪ್ರತಿ ಎಕರೆಗೆ ಖರ್ಚು-ವೆಚ್ಚ ಮತ್ತು ನಿವ್ವಳ ಲಾಭದ ಲೆಕ್ಕಾಚಾರ.\n` +
            `• **ಕೀಟ ಮತ್ತು ರೋಗ ರಕ್ಷಣೆ:** ಸೈನಿಕ ಹುಳು, ಕಾಂಡ ಕೊರೆಯುವ ಹುಳು ನಿಯಂತ್ರಣ ಕ್ರಮಗಳು.\n\n` +
            `ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ!`,
      mode: "knowledge-engine"
    };
  }

  return {
    text: `Hello! I am your **Namma Krishi** smart agricultural assistant. 🌾\n\n` +
          `I am ready to help you with:\n` +
          `• **Crop Selection:** Best crops for your ${soils} in ${district}.\n` +
          `• **Live Weather:** Rainfall forecasts, temperature trends, and sowing windows.\n` +
          `• **Market Prices:** Mandi rates across APMC centers in Karnataka.\n` +
          `• **Yield & Profit:** Calculations for Gross Revenue and Estimated Net Profit per acre.\n` +
          `• **Pest & Disease Protection:** Organic & IPM solutions for Fall Armyworm, Blast, Stem Borer, etc.\n\n` +
          `How can I assist your farm today?`,
    mode: "knowledge-engine"
  };
}
