import { crops } from "../data/crops.js";

const bound = (value, min, max) => Math.min(max, Math.max(min, value));

export function recommend(input = {}) {
  const soils = Array.isArray(input.soils) ? input.soils : [];
  const water = ["low", "medium", "high"].includes(input.waterAvailability) ? input.waterAvailability : "medium";
  const rain = bound(Number(input.rainfall ?? 650), 0, 2500);
  const month = Number(input.month ?? new Date().getMonth() + 1);
  const area = bound(Number(input.landArea ?? 1), 0.1, 100000);
  const season = input.season || (month >= 6 && month <= 9 ? "Kharif" : month >= 10 || month <= 2 ? "Rabi" : "Summer");

  return crops.map((crop) => {
    const soilPoints = soils.length ? (soils.some((soil) => crop.soils.includes(soil)) ? 28 : 8) : 14;
    const waterPoints = water === "low" ? crop.waterScore * 0.27 : water === "high" ? (100 - crop.waterScore) * 0.27 : 17;
    const rainPoints = rain < 400 ? (crop.waterScore > 75 ? 22 : 8)
      : rain > 1200 ? (crop.water === "high" ? 22 : crop.water === "medium" ? 16 : 9)
        : crop.water === "medium" ? 19 : 17;
    const seasonPoints = crop.sowMonths.includes(month) || crop.season.includes(season) ? 18 : 6;
    const total = Math.round(bound(soilPoints + waterPoints + rainPoints + seasonPoints + Math.max(0, 14 - crop.riskScore * 0.12), 0, 100));
    const price = bound(Number(input.prices?.[crop.name] ?? crop.price), 0, 1000000);
    const cost = bound(Number(input.costs?.[crop.name] ?? crop.costPerAcre), 0, 1000000);
    const yieldPerAcre = crop.yieldPerAcre * (1 + (rain - 650) / 10000);
    const revenue = Math.round(yieldPerAcre * price);
    const totalCost = Math.round(cost);
    const profitPerAcre = revenue - totalCost;
    const reasons = [];
    if (soilPoints >= 24) reasons.push(`matches the selected ${soils.filter((soil) => crop.soils.includes(soil)).join(", ")} soil`);
    else if (!soils.length) reasons.push("soil type has not been specified");
    else reasons.push("soil match is limited; seek local advice");
    reasons.push(water === "low" && crop.waterScore > 75 ? "fits lower water availability" : water === "high" ? "water supply is available for this crop" : `has ${crop.water} water needs`);
    reasons.push(crop.sowMonths.includes(month) ? "the reference sowing window includes this month" : "check the local sowing window before planting");
    return {
      ...crop, score: total, reasons, expectedYield: Number((yieldPerAcre * area).toFixed(1)),
      cost: totalCost * area, revenue: revenue * area, profit: profitPerAcre * area,
      pricePerQuintal: price, estimatedCostPerAcre: cost, area,
      sowingMonths: crop.sowMonths, harvestMonths: crop.sowMonths.map((monthNumber) => ((monthNumber + Math.round(crop.duration / 30) - 1) % 12) + 1),
      season
    };
  }).sort((a, b) => b.score - a.score);
}
