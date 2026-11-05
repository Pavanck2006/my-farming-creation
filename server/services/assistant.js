import axios from "axios";

export async function answerAssistant(message, context = {}) {
  const system = `You are CropWise, a cautious agricultural information assistant. Reply in the requested language (${context.language === "kn" ? "Kannada" : "English"}). Use only the supplied farmer context. Never invent weather, live market prices, district-specific facts, or diagnoses. Explain general guidance simply. Never guarantee yields/profits or give pesticide doses; refer uncertain issues to a local agricultural officer. Context: ${JSON.stringify(context)}`;
  if (process.env.AI_API_URL && process.env.AI_API_KEY) {
    const response = await axios.post(process.env.AI_API_URL, {
      model: process.env.AI_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: system }, { role: "user", content: message }]
    }, { headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` }, timeout: 20000 });
    const content = response.data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned an empty answer.");
    return { text: content, mode: "ai" };
  }
  const lower = message.toLowerCase();
  let text = context.language === "kn"
    ? "ನಿಮ್ಮ ಹೊಲಕ್ಕೆ ಸೂಕ್ತ ಬೆಳೆಗಳನ್ನು ಹೋಲಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡಬಹುದು. ಹೆಚ್ಚು ಉಪಯುಕ್ತ ಸಲಹೆಗಾಗಿ ಮಣ್ಣು, ನೀರಿನ ಲಭ್ಯತೆ ಮತ್ತು ಋತುವಿನ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ. ಸ್ಥಳೀಯ ಸಲಹೆಗೆ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
    : "I can help compare general crop options. Select your soil, water availability and planting season in Farm Profile to get a more useful, explainable recommendation. For locally specific advice, please check with your nearest agricultural extension office.";
  if (lower.includes("water") || lower.includes("dry")) {
    text = context.language === "kn"
      ? "ನೀರು ಕಡಿಮೆ ಇದ್ದರೆ ರಾಗಿ, ಜೋಳ, ಕಡಲೆಕಾಯಿ ಅಥವಾ ದ್ವಿದಳ ಧಾನ್ಯಗಳಂತಹ ಕಡಿಮೆ ನೀರಿನ ಆಯ್ಕೆಗಳನ್ನು ಹೋಲಿಸಿ. ಸೂಕ್ತತೆ ಮಣ್ಣು, ತಳಿ ಮತ್ತು ಮಳೆಯ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿದೆ. ಬಿತ್ತುವ ಮೊದಲು ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಯ ಸಲಹೆ ಪರಿಶೀಲಿಸಿ."
      : "With limited water, compare lower-water options such as ragi, sorghum, groundnut or pulses in the recommendation list. Suitability varies by soil, variety and local rainfall. Check the weather forecast and ask your local agricultural officer before planting.";
  } else if (lower.includes("profit") || lower.includes("price")) {
    text = context.language === "kn"
      ? "ಲಾಭದ ಅಂಕೆಗಳು ಮಾದರಿ ಅಂದಾಜುಗಳು ಮಾತ್ರ, ಖಾತರಿ ಅಲ್ಲ. ಪ್ರಸ್ತುತ ಪರಿಶೀಲಿತ ಮಾರುಕಟ್ಟೆ ದತ್ತಾಂಶ ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ; ಆದ್ದರಿಂದ ಇಂದಿನ ಮಂಡಿ ಬೆಲೆಯನ್ನು ಖಚಿತಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಿರ್ಧಾರಕ್ಕೂ ಮೊದಲು ದಿನಾಂಕವಿರುವ ಸ್ಥಳೀಯ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಪರಿಶೀಲಿಸಿ."
      : "Profit figures are rough model estimates, not guarantees. CropWise has no verified live market feed configured right now, so I cannot confirm current mandi prices. Check a dated local market listing before making a decision.";
  } else if (lower.includes("pest") || lower.includes("disease")) {
    text = context.language === "kn"
      ? "ಬಾಧಿತ ಸಸ್ಯಗಳನ್ನು ಗಮನಿಸಿ ಮತ್ತು ಲಕ್ಷಣಗಳು ಎಲ್ಲಿ ಕಾಣುತ್ತವೆ ಎಂದು ದಾಖಲಿಸಿ. ಹೊಲದ ಸ್ವಚ್ಛತೆ ಮತ್ತು ನಿಯಮಿತ ಪರಿಶೀಲನೆ ಮಾಡಿ. ಈ ಚಾಟ್ ಬೆಳೆ ರೋಗವನ್ನು ಖಚಿತಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಚಿಕಿತ್ಸೆಗೆ ಮೊದಲು ಸ್ಥಳೀಯ ಕೃಷಿ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ ಮತ್ತು ನೋಂದಾಯಿತ ಉತ್ಪನ್ನದ ಲೇಬಲ್ ಅನುಸರಿಸಿ."
      : "Inspect affected plants and note where symptoms appear. Use field sanitation and regular monitoring as preventive steps. This chat cannot diagnose a crop image. Please consult a local agricultural expert before treatment, and follow only registered product labels.";
  } else if (lower.includes("when") || lower.includes("sow")) {
    text = context.language === "kn"
      ? "CropWise ನಲ್ಲಿನ ಬಿತ್ತನೆ ಅವಧಿಗಳು ಸಾಮಾನ್ಯ ಉಲ್ಲೇಖಗಳು ಮಾತ್ರ, ಸ್ಥಳೀಯ ಮುನ್ಸೂಚನೆ ಅಲ್ಲ. ಬಿತ್ತುವ ಮೊದಲು ಏಳು ದಿನಗಳ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಮತ್ತು ನಿಮ್ಮ ಸ್ಥಳೀಯ ಕೃಷಿ ಕಚೇರಿಯ ಸಲಹೆ ಪರಿಶೀಲಿಸಿ."
      : "Sowing windows in CropWise are general crop references, not a local forecast. Check the seven-day weather forecast and your local agricultural office for the current district and season before sowing.";
  }
  return { text, mode: "rule-based" };
}
