import axios from "axios";
import { DEMO_MARKET_RECORDS } from "./market.js";
import { crops } from "../data/crops.js";

// System prompt for external LLM API if configured
const buildSystemPrompt = (context) => `
You are Namma Krishi AI (ನಮ್ಮ ಕೃಷಿ AI), an empathetic, knowledgeable, and reliable agricultural assistant built for Karnataka's farmers.
Respond in ${context.language === "kn" ? "Kannada (ಕನ್ನಡ)" : "English"}.
Farmer Profile & Farm Context:
- Location: ${context.taluk ? `${context.taluk}, ` : ""}${context.district || "Karnataka"}
- Soil Type: ${context.soils?.join(", ") || "General arable soil"}
- Water Availability: ${context.waterAvailability || "Moderate"}
- Current Season: ${context.season || "Kharif"}
- Weather: ${JSON.stringify(context.weather || {})}

Guidelines:
1. Provide accurate, practical farming advice covering crop selection, weather adaptation, market prices, yield & profit calculations, and integrated pest protection.
2. For yield and profit calculations, always emphasize the formulas:
   - Gross Revenue = Expected Yield (q/acre) × Market Price (₹/q)
   - Estimated Net Profit = Gross Revenue − Cultivation Cost (₹/acre)
   Remind the farmer that these are model estimates and never guaranteed.
3. For pest control, recommend Integrated Pest Management (IPM), including field sanitation, organic neem oil (Azadirachtin), pheromone traps, and advise consulting the nearest Raitha Samparka Kendra (RSK) / KVK.
4. Keep the tone respectful, clear, and encouraging for rural farmers.
`;

// Helper: find mandi price for a crop in farmer's district or Karnataka
function getMandiQuote(cropName, district = "") {
  const normCrop = (cropName || "").toLowerCase();
  const normDist = (district || "").toLowerCase();
  const districtMatch = DEMO_MARKET_RECORDS.find(
    (r) => r.crop.toLowerCase().includes(normCrop) && (!normDist || r.district.toLowerCase().includes(normDist))
  );
  if (districtMatch) return districtMatch;
  return DEMO_MARKET_RECORDS.find((r) => r.crop.toLowerCase().includes(normCrop));
}

export async function answerAssistant(message, context = {}) {
  const isKannada = context.language === "kn" || /[\u0C80-\u0CFF]/.test(message);
  const q = (message || "").toLowerCase();

  // 1. Check for Gemini API or OpenAI / external LLM API
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const aiUrl = process.env.AI_API_URL;

  // Try Gemini API if key is present
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: `${buildSystemPrompt(context)}\n\nFarmer Question: ${message}` }
            ]
          }
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
  if (aiUrl && openaiKey) {
    try {
      const response = await axios.post(
        aiUrl,
        {
          model: process.env.AI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: buildSystemPrompt(context) },
            { role: "user", content: message }
          ]
        },
        {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 15000
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
              `🌾 **ಕರ್ನಾಟಕದ ಪ್ರಮುಖ ಬೆಳೆಗಳ ಅಂದಾಜು ಉದಾಹರಣೆಗಳು (ಪ್ರತಿ ಎಕರೆಗೆ):**\n` +
              `• **ರಾಗಿ (Ragi):** ಇಳುವರಿ ~10 ಕ್ವಿಂ, ದರ ~₹3,800/ಕ್ವಿಂ = ಒಟ್ಟು ಆದಾಯ ₹38,000. ಸಾಗುವಳಿ ವೆಚ್ಚ ~₹13,500. **ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ: ~₹24,500 / ಎಕರೆ**.\n` +
              `• **ಮುಸುಕಿನ ಜೋಳ (Maize):** ಇಳುವರಿ ~24 ಕ್ವಿಂ, ದರ ~₹2,200/ಕ್ವಿಂ = ಒಟ್ಟು ಆದಾಯ ₹52,800. ಸಾಗುವಳಿ ವೆಚ್ಚ ~₹24,500. **ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ: ~₹28,300 / ಎಕರೆ**.\n` +
              `• **ಕಡಲೆಕಾಯಿ (Groundnut):** ಇಳುವರಿ ~8 ಕ್ವಿಂ, ದರ ~₹6,200/ಕ್ವಿಂ = ಒಟ್ಟು ಆದಾಯ ₹49,600. ಸಾಗುವಳಿ ವೆಚ್ಚ ~₹22,000. **ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ: ~₹27,600 / ಎಕರೆ**.\n` +
              `• **ಭತ್ತ (Paddy):** ಇಳುವರಿ ~22 ಕ್ವಿಂ, ದರ ~₹2,300/ಕ್ವಿಂ = ಒಟ್ಟು ಆದಾಯ ₹50,600. ಸಾಗುವಳಿ ವೆಚ್ಚ ~₹34,000. **ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ: ~₹16,600 / ಎಕರೆ**.\n\n` +
              `⚠️ *ಸೂಚನೆ: ಇವು ಕೃಷಿ ಉಲ್ಲೇಖದ ಮಾದರಿ ಅಂದಾಜುಗಳು ಮಾತ್ರ. ನೈಜ ಇಳುವರಿ ಮತ್ತು ಲಾಭ ಮಳೆ, ತಳಿ, ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಏರಿಳಿತದ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿರುತ್ತದೆ.*`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `📊 **Crop Yield and Net Profit Calculation Formulas:**\n\n` +
            `1. **Gross Revenue** = Expected Yield (quintals/acre) × Market Price (₹/quintal)\n` +
            `2. **Estimated Net Profit** = Gross Revenue − Cultivation Cost (₹/acre)\n\n` +
            `🌾 **Illustrative Benchmarks for Karnataka (per acre):**\n` +
            `• **Ragi (Finger Millet):** Expected Yield ~10 q/ac @ ₹3,800/q = ₹38,000 Revenue. Cultivation cost ~₹13,500. **Estimated Net Profit: ~₹24,500 / acre**.\n` +
            `• **Maize:** Expected Yield ~24 q/ac @ ₹2,200/q = ₹52,800 Revenue. Cultivation cost ~₹24,500. **Estimated Net Profit: ~₹28,300 / acre**.\n` +
            `• **Groundnut:** Expected Yield ~8 q/ac @ ₹6,200/q = ₹49,600 Revenue. Cultivation cost ~₹22,000. **Estimated Net Profit: ~₹27,600 / acre**.\n` +
            `• **Paddy:** Expected Yield ~22 q/ac @ ₹2,300/q = ₹50,600 Revenue. Cultivation cost ~₹34,000. **Estimated Net Profit: ~₹16,600 / acre**.\n\n` +
            `💡 *You can also use our interactive "Calculate My Own Profit" calculator on any crop card in the Crop Planner to test your own yield and price scenarios!*`,
      mode: "knowledge-engine"
    };
  }

  // Intent B: Market Prices & Mandi Rates
  if (q.includes("market") || q.includes("mandi") || q.includes("price") || q.includes("rate") || q.includes("ಬೆಲೆ") || q.includes("ದರ") || q.includes("ಮಾರುಕಟ್ಟೆ") || q.includes("ಮಂಡಿ")) {
    const quoteRagi = getMandiQuote("Ragi", context.district);
    const quoteMaize = getMandiQuote("Maize", context.district);
    const quoteTomato = getMandiQuote("Tomato", context.district);
    const quoteTur = getMandiQuote("Tur", context.district);

    if (isKannada) {
      return {
        text: `🛒 **ಕರ್ನಾಟಕ ಮಾರುಕಟ್ಟೆ ದರಗಳ ಮಾದರಿ (ಡೆಮೋ; ನೈಜ ಧಾರಣೆಗಳಲ್ಲ):**\n\n` +
              `• **ರಾಗಿ (Ragi):** ${quoteRagi ? `${quoteRagi.market} ನಲ್ಲಿ ಮಾದರಿ ದರ ₹${quoteRagi.modalPrice.toLocaleString("en-IN")}/ಕ್ವಿಂ (ಕನಿಷ್ಠ ₹${quoteRagi.minPrice} - ಗರಿಷ್ಠ ₹${quoteRagi.maxPrice})` : "₹3,800/ಕ್ವಿಂ"}\n` +
              `• **ಮುಸುಕಿನ ಜೋಳ (Maize):** ${quoteMaize ? `${quoteMaize.market} ನಲ್ಲಿ ಮಾದರಿ ದರ ₹${quoteMaize.modalPrice.toLocaleString("en-IN")}/ಕ್ವಿಂ (ಕನಿಷ್ಠ ₹${quoteMaize.minPrice} - ಗರಿಷ್ಠ ₹${quoteMaize.maxPrice})` : "₹2,240/ಕ್ವಿಂ"}\n` +
              `• **ತೊಗರಿ (Tur/Pigeon Pea):** ${quoteTur ? `${quoteTur.market} ನಲ್ಲಿ ಮಾದರಿ ದರ ₹${quoteTur.modalPrice.toLocaleString("en-IN")}/ಕ್ವಿಂ (ಕನಿಷ್ಠ ₹${quoteTur.minPrice} - ಗರಿಷ್ಠ ₹${quoteTur.maxPrice})` : "₹7,400/ಕ್ವಿಂ"}\n` +
              `• **ಟೊಮೆಟೊ (Tomato):** ${quoteTomato ? `${quoteTomato.market} ನಲ್ಲಿ ಮಾದರಿ ದರ ₹${quoteTomato.modalPrice.toLocaleString("en-IN")}/ಕ್ವಿಂ` : "₹1,800/ಕ್ವಿಂ"}\n\n` +
              `📍 ಇವು ಡೆಮೋ ಮೌಲ್ಯಗಳು ಮಾತ್ರ. ನೈಜ ದರಗಳಿಗಾಗಿ 'ಮಾರುಕಟ್ಟೆ ಧಾರಣೆ' ಪುಟದಲ್ಲಿನ ದಿನಾಂಕ ಮತ್ತು ಡೇಟಾ ಮೂಲವನ್ನು ಪರಿಶೀಲಿಸಿ.`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `🛒 **Illustrative Karnataka mandi values (demo only; not live quotes, per quintal):**\n\n` +
            `• **Ragi:** ${quoteRagi ? `${quoteRagi.market} modal price is ₹${quoteRagi.modalPrice.toLocaleString("en-IN")}/q (Range: ₹${quoteRagi.minPrice} – ₹${quoteRagi.maxPrice})` : "₹3,800/q"}\n` +
            `• **Maize:** ${quoteMaize ? `${quoteMaize.market} modal price is ₹${quoteMaize.modalPrice.toLocaleString("en-IN")}/q (Range: ₹${quoteMaize.minPrice} – ₹${quoteMaize.maxPrice})` : "₹2,240/q"}\n` +
            `• **Tur (Pigeon Pea):** ${quoteTur ? `${quoteTur.market} modal price is ₹${quoteTur.modalPrice.toLocaleString("en-IN")}/q (Range: ₹${quoteTur.minPrice} – ₹${quoteTur.maxPrice})` : "₹7,400/q"}\n` +
            `• **Tomato:** ${quoteTomato ? `${quoteTomato.market} modal price is ₹${quoteTomato.modalPrice.toLocaleString("en-IN")}/q` : "₹1,800/q"}\n\n` +
            `⚠️ These are demonstration values, not verified or live prices. Check the date and source shown on the **Market Prices** page before making decisions.`,
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
                `1. **ಆರಂಭಿಕ ಹಂತ (ಬಿತ್ತನೆಯಾದ 10-20 ದಿನ):** ಬೇವಿನ ಎಣ್ಣೆ (Azadirachtin 1500 ppm) 2-3 ಮಿ.ಲೀ. ಪ್ರತಿ ಲೀಟರ್ ನೀರಿಗೆ ಬೆರೆಸಿ ಸುಳಿಗೆ ಬೀಳುವಂತೆ ಸಿಂಪಡಿಸಿ.\n` +
                `2. **ಬಲೆಗಳು:** ಎಕರೆಗೆ 4-5 ಮೋಹಕ ಬಲೆಗಳನ್ನು (Pheromone traps) ಅಳವಡಿಸಿ.\n` +
                `3. **ಜೈವಿಕ ನಿಯಂತ್ರಣ:** ಟ್ರೈಕೋಗ್ರಾಮ ಪರಾವಲಂಬಿ ಕಾರ್ಡ್‌ಗಳನ್ನು ಬಳಸಿ.\n` +
                `4. **ತೀವ್ರ ಬಾಧೆ ಇದ್ದಲ್ಲಿ:** ತಜ್ಞರ ಸಲಹೆಯಂತೆ ಶಿಫಾರಸು ಮಾಡಿದ ಕೀಟನಾಶಕ (ಉದಾ: Emamectin Benzoate 5% SG @ 0.4 g/L) ಸಿಂಪಡಿಸಿ.\n\n` +
                `⚠️ *ಯಾವಾಗಲೂ ಸುರಕ್ಷತಾ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳನ್ನು ವಹಿಸಿ ಮತ್ತು ಸ್ಥಳೀಯ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರವನ್ನು (RSK) ಸಂಪರ್ಕಿಸಿ.*`,
          mode: "knowledge-engine"
        };
      }
      return {
        text: `🐛 **Maize Fall Armyworm (FAW) Integrated Pest Management:**\n\n` +
              `1. **Early Stage (10–20 DAS):** Spray organic Neem formulation (Azadirachtin 1500 ppm @ 2-3 ml/L) directing the spray into the plant whorl.\n` +
              `2. **Monitoring:** Install 4–5 FAW pheromone traps per acre for early detection.\n` +
              `3. **Biocontrol:** Release egg parasitoid *Trichogramma pretiosum* @ 50,000/acre.\n` +
              `4. **Threshold Chemical Intervention:** If whorl damage exceeds 10%, apply Emamectin Benzoate 5% SG @ 0.4 g/L or Chlorantraniliprole 18.5% SC @ 0.3 ml/L into whorls.\n\n` +
              `⚠️ *Always adhere to registered label doses and consult your local Krishi Vigyan Kendra (KVK).*`,
        mode: "knowledge-engine"
      };
    }

    if (q.includes("paddy") || q.includes("rice") || q.includes("ಭತ್ತ")) {
      if (isKannada) {
        return {
          text: `🌾 **ಭತ್ತದ ಬೆಳೆಯ ಕಾಂಡ ಕೊರೆಯುವ ಹುಳು ಮತ್ತು ಬೆಂಕಿ ರೋಗ (Blast) ನಿರ್ವಹಣೆ:**\n\n` +
                `1. **ಕಾಂಡ ಕೊರೆಯುವ ಹುಳು (Stem Borer):** ಎಕರೆಗೆ 4-5 ಲಿಂಗಾಕರ್ಷಕ ಬಲೆ ಇಡಿ. ಟ್ರೈಕೋಗ್ರಾಮಾ ಜಪಾನಿಕಂ ಪರಾವಲಂಬಿ ಬಳಸಿ. ತೀವ್ರವಿದ್ದಾಗ ಕ್ಲೋರಂಟ್ರಾನಿಲಿಪ್ರೋಲ್ 0.4g/L ಬಳಸಿ.\n` +
                `2. **ಬೆಂಕಿ ರೋಗ (Blast Disease):** ಸಾರಜನಕ (ಯೂರಿಯಾ) ಗೊಬ್ಬರವನ್ನು ಅತಿಯಾಗಿ ಬಳಸಬೇಡಿ. ಸೂಡೊಮೊನಾಸ್ ಫ್ಲೋರೊಸೆನ್ಸ್ 5g/L ಸಿಂಪಡಿಸಿ. ತೀವ್ರವಿದ್ದಾಗ ಟ್ರೈಸೈಕ್ಲಾಜೋಲ್ 75 WP (0.6 g/L) ಸಿಂಪಡಿಸಿ.\n` +
                `3. ಹೊಲದಲ್ಲಿ ನೀರು ಬಸಿದು ಹೋಗುವಂತೆ ನೋಡಿಕೊಳ್ಳಿ.`,
          mode: "knowledge-engine"
        };
      }
      return {
        text: `🌾 **Paddy Stem Borer & Blast Disease Management:**\n\n` +
              `1. **Yellow Stem Borer:** Install 4–5 pheromone traps/acre. Release *Trichogramma japonicum*. If dead-hearts exceed 10%, apply Cartap Hydrochloride 50% SP @ 2 g/L or Chlorantraniliprole 18.5% SC @ 0.3 ml/L.\n` +
              `2. **Blast Disease (*Magnaporthe grisea*):** Avoid excessive split application of Nitrogen (Urea). Spray *Pseudomonas fluorescens* @ 5 g/L preventively, or Tricyclazole 75% WP @ 0.6 g/L upon early spindle lesion detection.\n` +
              `3. Maintain proper field drainage and destroy infected stubbles after harvest.`,
        mode: "knowledge-engine"
      };
    }

    if (isKannada) {
      return {
        text: `🛡️ **ಸಮಗ್ರ ಕೀಟ ಮತ್ತು ರೋಗ ನಿರ್ವಹಣೆ (IPM) ಸೂತ್ರಗಳು:**\n\n` +
              `1. **ಮುನ್ನೆಚ್ಚರಿಕೆ:** ಬೀಜೋಪಚಾರ (ಟ್ರೈಕೋಡರ್ಮಾ ಅಥವಾ ಸೂಡೊಮೊನಾಸ್ ಬಳಸಿ).\n` +
              `2. **ಜೈವಿಕ ರಕ್ಷಣೆ:** ಎಕರೆಗೆ 5-8 ಹಳದಿ/ನೀಲಿ ಜಿಗುಟು ಬಲೆಗಳು ಮತ್ತು ಬೇವಿನ ಎಣ್ಣೆ (Azadirachtin 1500 ppm @ 3 ml/L) ಸಿಂಪಡಣೆ.\n` +
              `3. **ಹೊಲದ ಸ್ವಚ್ಛತೆ:** ಕಳೆ ನಿರ್ಮೂಲನೆ ಮತ್ತು ಸೋಂಕಿತ ಸಸ್ಯ ಭಾಗಗಳ ನಾಶ.\n` +
              `4. ನಿರ್ದಿಷ್ಟ ಬೆಳೆಯ ಕೀಟದ ಲಕ್ಷಣ ತಿಳಿಸಿ (ಉದಾ: 'ಮುಸುಕಿನ ಜೋಳ', 'ರಾಗಿ', 'ತೊಗರಿ', 'ಟೊಮೆಟೊ') ಹೆಚ್ಚಿನ ವಿವರ ನೀಡುತ್ತೇನೆ.`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `🛡️ **Integrated Pest & Disease Management (IPM) Guidelines:**\n\n` +
      `1. **Seed Treatment:** Treat seeds with *Trichoderma viride* (4 g/kg) or *Pseudomonas fluorescens* (10 g/kg) to protect seedlings from soil-borne damping off.\n` +
      `2. **Eco-friendly Traps:** Install yellow sticky traps (aphids, whiteflies) and crop-specific pheromone traps.\n` +
      `3. **Botanical Sprays:** Use 5% Neem Seed Kernel Extract (NSKE) or Azadirachtin 1500 ppm @ 3 ml/L as early preventive intervention.\n` +
      `4. Tell me your specific crop (e.g. *Maize, Ragi, Paddy, Tur, Tomato*) for targeted diagnosis and chemical/biological recommendations!`,
      mode: "knowledge-engine"
    };
  }

  // Intent E: Crop Selection & Suitability
  if (q.includes("crop") || q.includes("grow") || q.includes("select") || q.includes("recommend") || q.includes("soil") || q.includes("water") || q.includes("ಬೆಳೆ") || q.includes("ಮಣ್ಣು") || q.includes("ಆಯ್ಕೆ")) {
    if (isKannada) {
      return {
        text: `🌱 **${district} ಭಾಗಕ್ಕೆ ಸೂಕ್ತ ಬೆಳೆಗಳ ಶಿಫಾರಸು (ಮಣ್ಣು: ${soils}, ನೀರು: ${water}):**\n\n` +
              `1. **ರಾಗಿ (Ragi - GPU-28, ML-365):** ಕಡಿಮೆ ನೀರಿನಲ್ಲೂ ಅತ್ಯುತ್ತಮವಾಗಿ ಬೆಳೆಯುವ ಪೌಷ್ಟಿಕ ಬೆಳೆ. ಕೆಂಪು ಮತ್ತು ಗೋಡು ಮಣ್ಣಿಗೆ ಸೂಕ್ತ. ಎಕರೆಗೆ ಅಂದಾಜು ₹24,000+ ನಿವ್ವಳ ಲಾಭ.\n` +
              `2. **ಮುಸುಕಿನ ಜೋಳ (Maize):** ಮಧ್ಯಮ ನೀರಿನ ಲಭ್ಯತೆ ಇದ್ದರೆ ಹೆಚ್ಚಿನ ಇಳುವರಿ (20-25 ಕ್ವಿಂ/ಎಕರೆ) ನೀಡುವ ಬೆಳೆ.\n` +
              `3. **ಕಡಲೆಕಾಯಿ (Groundnut):** ಎಣ್ಣೆಕಾಳು ಬೆಳೆಯಾಗಿದ್ದು ದ್ವಿದಳ ಧಾನ್ಯದಂತೆ ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಹೆಚ್ಚಿಸುತ್ತದೆ. ಮರಳು-ಗೋಡು ಮಣ್ಣಿಗೆ ಅತ್ಯುತ್ತಮ.\n` +
              `4. **ತೊಗರಿ / ದ್ವಿದಳ ಧಾನ್ಯಗಳು:** ಕಡಿಮೆ ನೀರಿನಲ್ಲಿ ಉತ್ತಮ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ (~₹7,500/ಕ್ವಿಂ) ನೀಡುವ ಬೆಳೆ.\n\n` +
              `👉 ಸಂಪೂರ್ಣ ವೈಜ್ಞಾನಿಕ ಸ್ಕೋರ್ ಮತ್ತು ಬೆಳೆ ಹೋಲಿಕೆಗಾಗಿ 'ಬೆಳೆ ಯೋಜನೆ' (Crop Planner) ಪುಟಕ್ಕೆ ಭೇಟಿ ನೀಡಿ!`,
        mode: "knowledge-engine"
      };
    }
    return {
      text: `🌱 **Top Recommended Crops for ${district} (${soils}, ${water} water availability):**\n\n` +
            `1. **Ragi (Finger Millet - GPU-28, ML-365):** Highly resilient, drought-tolerant, and thrives in red/loamy soils. Delivers consistent ~₹24,500/acre net profit.\n` +
            `2. **Maize (High-Yield Hybrids):** Excellent choice where moderate irrigation and good drainage are present (potential 22–25 q/acre).\n` +
            `3. **Groundnut (TMV-2, JL-24):** Superior oilseed option that enriches soil nitrogen while fetching strong market prices (~₹6,200/q).\n` +
            `4. **Tur (Pigeon Pea) / Pulses:** High-value pulse option demanding minimal irrigation with strong market demand (~₹7,400/q).\n\n` +
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
