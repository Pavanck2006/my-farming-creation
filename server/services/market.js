import axios from "axios";

export async function getMarketPrices(query = {}) {
  if (!process.env.MARKET_API_URL) {
    return { available: false, source: null, prices: [], reason: "No market data provider is configured. No live or sample prices are shown." };
  }
  const response = await axios.get(process.env.MARKET_API_URL, {
    params: { ...(query.crop ? { crop: query.crop } : {}), ...(query.district ? { district: query.district } : {}) },
    headers: process.env.MARKET_API_KEY ? { "X-Api-Key": process.env.MARKET_API_KEY } : {},
    timeout: 10000
  });
  const rows = Array.isArray(response.data) ? response.data : response.data?.records;
  if (!Array.isArray(rows)) throw new Error("Market provider response did not contain a recognized records array.");
  const prices = rows.map((row) => ({
    crop: row.crop || row.commodity || row.commodity_name,
    market: row.market || row.market_name || row.mandi,
    district: row.district,
    minPrice: Number(row.minPrice ?? row.min_price),
    maxPrice: Number(row.maxPrice ?? row.max_price),
    modalPrice: Number(row.modalPrice ?? row.modal_price),
    date: row.date || row.arrival_date || row.market_date,
    source: row.source || process.env.MARKET_API_URL
  })).filter((row) => row.crop && row.market && row.date && Number.isFinite(Date.parse(row.date)) && row.source && Number.isFinite(row.minPrice) && Number.isFinite(row.maxPrice) && Number.isFinite(row.modalPrice));
  return { available: prices.length > 0, source: "Configured market provider", prices, reason: prices.length ? undefined : "The configured provider returned no dated, sourced prices." };
}
