import { crops } from "../data/crops.js";

const DATA_SOURCE = "Namma Krishi crop-planner assumptions (illustrative estimates)";

export const CROP_CATEGORIES = {
  "Cereals & Millets": [
    "Ragi", "Maize", "Paddy", "Sorghum (Jowar)", "Pearl millet (Bajra)",
    "Foxtail millet (Navane)", "Little millet (Same)", "Kodo millet (Araka)"
  ],
  Pulses: [
    "Tur (Pigeon pea)", "Chickpea (Bengal gram)", "Green gram", "Black gram (Urad)",
    "Horse gram (Huruli)", "Cowpea (Alasande)", "Field bean (Avare)"
  ],
  Oilseeds: ["Groundnut", "Sunflower", "Soybean", "Sesame (Ellu)", "Safflower", "Castor"],
  Commercial: ["Cotton", "Sugarcane", "Tobacco"],
  Vegetables: ["Chilli (Byadgi)", "Onion", "Tomato", "Potato", "Sweet potato", "Garlic", "Cabbage"],
  Spices: ["Turmeric", "Ginger", "Cardamom", "Black pepper"],
  Fruits: ["Banana", "Mango", "Grapes", "Pomegranate", "Papaya", "Guava", "Sweet orange"],
  "Plantation Crops": ["Arecanut", "Coconut", "Coffee", "Cashew"]
};

const clean = (value) => String(value || "").trim().toLocaleLowerCase("en-IN");

function categoryFor(cropName) {
  return Object.entries(CROP_CATEGORIES).find(([, names]) =>
    names.some((name) => clean(name) === clean(cropName))
  )?.[0] || "Other";
}

function createEstimate(crop) {
  const modalPrice = Math.round(Number(crop.price) / 10) * 10;

  return {
    crop: crop.name,
    category: categoryFor(crop.name),
    market: "Planning estimate",
    district: "General reference",
    minPrice: Math.round(modalPrice * 0.9 / 10) * 10,
    maxPrice: Math.round(modalPrice * 1.1 / 10) * 10,
    modalPrice,
    yieldPerAcre: crop.yieldPerAcre,
    estimatedGrossValuePerAcre: Math.round(crop.yieldPerAcre * modalPrice),
    date: null,
    source: DATA_SOURCE
  };
}

export async function getMarketPrices(query = {}) {
  const allEstimates = crops.map(createEstimate);
  const prices = allEstimates.filter((record) =>
    (!query.crop || clean(record.crop).includes(clean(query.crop))) &&
    (!query.category || query.category === "all" || record.category === query.category)
  );

  return {
    available: prices.length > 0,
    isLive: false,
    isCached: false,
    isEstimate: true,
    locationSpecific: false,
    source: DATA_SOURCE,
    statusLabel: "Illustrative planning estimates — not current market prices",
    reason: "These indicative ranges reuse the crop planner's existing price assumptions (±10%). They are not from a live feed or observed transactions; they are general references. Confirm today's rate with your local APMC before making a selling decision.",
    fetchedAt: null,
    latestDate: null,
    prices,
    availableMarkets: [],
    availableDistricts: [],
    availableCrops: allEstimates.map((record) => record.crop).sort(),
    categories: ["all", ...new Set(allEstimates.map((record) => record.category))]
  };
}
