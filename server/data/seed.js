import "dotenv/config";
import mongoose from "mongoose";
import { crops } from "./crops.js";
import { locations } from "./locations.js";
import { Crop, District, Soil, Taluk } from "../models/index.js";

await mongoose.connect(process.env.MONGODB_URI || "");
try {
  await Promise.all(locations.map(async (district) => {
    await District.updateOne({ externalId: district.id }, { name: district.name, externalId: district.id }, { upsert: true });
    await Promise.all(district.taluks.map((taluk) => Taluk.updateOne(
      { externalId: taluk.id }, { name: taluk.name, districtId: district.id, externalId: taluk.id }, { upsert: true }
    )));
  }));
  await Promise.all(["red", "black", "alluvial", "laterite", "sandy", "clay", "loamy"].map((name) =>
    Soil.updateOne({ name }, { name }, { upsert: true })
  ));
  await Promise.all(crops.map((crop) => Crop.updateOne({ name: crop.name }, crop, { upsert: true })));
  console.log(`Seeded ${locations.length} districts, ${locations.reduce((sum, item) => sum + item.taluks.length, 0)} taluks, 7 soil categories and ${crops.length} crops.`);
} finally {
  await mongoose.disconnect();
}
