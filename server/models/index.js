import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  language: { type: String, enum: ["en", "kn"], default: "en" },
  districtId: String,
  district: String,
  talukId: String,
  taluk: String,
  village: { type: String, trim: true, default: "" },
  photoUrl: { type: String, default: "" },
  soils: [{ type: String, enum: ["red", "black", "alluvial", "laterite", "sandy", "clay", "loamy"] }],
  landArea: { type: Number, min: 0, default: 1 },
  waterAvailability: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  soilPh: { type: Number, min: 0, max: 14 }
}, { timestamps: true });

const cropSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  soils: [String],
  water: String,
  duration: Number,
  season: [String],
  yieldPerAcre: Number,
  costPerAcre: Number,
  price: Number
});

const districtSchema = new mongoose.Schema({ name: { type: String, unique: true }, externalId: String });
const talukSchema = new mongoose.Schema({ name: String, districtId: String, externalId: String });
const soilSchema = new mongoose.Schema({ name: { type: String, unique: true } });
const marketPriceSchema = new mongoose.Schema({
  crop: String, market: String, district: String, minPrice: Number, maxPrice: Number,
  modalPrice: Number, date: String, source: String
}, { timestamps: true });

const cropPlanSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true, index: true },
  name: String,
  crops: [String],
  area: Number,
  season: String,
  notes: String,
  simulation: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const chatHistorySchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true, index: true },
  messages: [{ role: { type: String, enum: ["user", "assistant"] }, content: String, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ["sowing", "calendar", "weather", "pest", "market", "general"],
    default: "general"
  },
  read: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const activitySchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer", required: true, index: true },
  activityType: {
    type: String,
    enum: [
      "crop_recommendation",
      "crop_comparison",
      "crop_plan_created",
      "crop_plan_saved",
      "profile_updated",
      "photo_uploaded",
      "ai_conversation",
      "calendar_viewed",
      "completed_activity",
      "login",
      "general"
    ],
    default: "general"
  },
  title: { type: String, required: true },
  cropName: { type: String, default: "" },
  details: { type: String, default: "" },
  status: { type: String, default: "completed" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export const Farmer = mongoose.models.Farmer || mongoose.model("Farmer", farmerSchema);
export const Crop = mongoose.models.Crop || mongoose.model("Crop", cropSchema);
export const District = mongoose.models.District || mongoose.model("District", districtSchema);
export const Taluk = mongoose.models.Taluk || mongoose.model("Taluk", talukSchema);
export const Soil = mongoose.models.Soil || mongoose.model("Soil", soilSchema);
export const MarketPrice = mongoose.models.MarketPrice || mongoose.model("MarketPrice", marketPriceSchema);
export const CropPlan = mongoose.models.CropPlan || mongoose.model("CropPlan", cropPlanSchema);
export const ChatHistory = mongoose.models.ChatHistory || mongoose.model("ChatHistory", chatHistorySchema);
export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema);
