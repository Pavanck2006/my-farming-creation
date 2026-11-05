import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import { crops } from "../data/crops.js";
import { locations } from "../data/locations.js";
import { requireAuth } from "../middleware/auth.js";
import { Activity, ChatHistory, CropPlan, Farmer, Notification } from "../models/index.js";
import { answerAssistant } from "../services/assistant.js";
import { getMarketPrices } from "../services/market.js";
import { recommend } from "../services/recommendations.js";
import { getWeather } from "../services/weather.js";
import {
  demoActivities,
  demoChats,
  demoFarmers,
  demoNotifications,
  demoPlans,
  phoneKey,
  validPhone
} from "../utils/otp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const soils = ["red", "black", "alluvial", "laterite", "sandy", "clay", "loamy"];
const demoMode = () => mongoose.connection.readyState !== 1;

const farmerLookup = async (id) =>
  demoMode()
    ? [...demoFarmers.values()].find((farmer) => (farmer._id?.toString() || farmer.id || farmer._id) === id) || null
    : Farmer.findById(id);

const normalizedFarmer = (farmer) => {
  if (!farmer) return null;
  const id = farmer._id?.toString() || farmer.id || farmer._id;
  const soilsList = Array.isArray(farmer.soils) ? farmer.soils : [];
  const isComplete = Boolean(
    farmer.name &&
    farmer.phone &&
    farmer.district &&
    farmer.taluk &&
    farmer.village &&
    soilsList.length > 0 &&
    farmer.landArea &&
    farmer.waterAvailability
  );
  return {
    id,
    phone: farmer.phone,
    name: farmer.name,
    language: farmer.language || "en",
    districtId: farmer.districtId || "",
    district: farmer.district || "",
    talukId: farmer.talukId || "",
    taluk: farmer.taluk || "",
    village: farmer.village || "",
    photoUrl: farmer.photoUrl || "",
    soils: soilsList,
    landArea: Number(farmer.landArea) || 1,
    waterAvailability: farmer.waterAvailability || "medium",
    soilPh: farmer.soilPh ?? null,
    profileComplete: isComplete
  };
};

const issueToken = (farmer) =>
  jwt.sign(
    { sub: farmer._id?.toString() || farmer.id || farmer._id },
    process.env.JWT_SECRET || "cropwise-local-demo-secret",
    { expiresIn: "30d" }
  );

// Helper: Log Farmer Activity
export async function logActivity(farmerId, { activityType, title, cropName = "", details = "", status = "completed", metadata = {} }) {
  try {
    const actData = {
      farmer: farmerId,
      activityType: activityType || "general",
      title,
      cropName: cropName || "",
      details: details || "",
      status: status || "completed",
      metadata: metadata || {},
      createdAt: new Date()
    };
    if (demoMode()) {
      const list = demoActivities.get(farmerId) || [];
      const item = { ...actData, _id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` };
      list.unshift(item);
      demoActivities.set(farmerId, list.slice(0, 100));
      return item;
    }
    return await Activity.create(actData);
  } catch (err) {
    console.error("Error logging activity:", err.message);
  }
}

// Helper: Create Notification
export async function createNotification(farmerId, { title, description, type = "general", metadata = {} }) {
  try {
    const notifData = {
      farmer: farmerId,
      title,
      description,
      type,
      read: false,
      metadata,
      createdAt: new Date()
    };
    if (demoMode()) {
      const list = demoNotifications.get(farmerId) || [];
      const item = { ...notifData, _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` };
      list.unshift(item);
      demoNotifications.set(farmerId, list.slice(0, 50));
      return item;
    }
    return await Notification.create(notifData);
  } catch (err) {
    console.error("Error creating notification:", err.message);
  }
}

// Helper: Seed Context-Driven Real Agricultural Notifications
async function seedFarmerNotifications(farmer) {
  try {
    const farmerId = farmer._id?.toString() || farmer.id || farmer._id;
    let existingCount = 0;
    if (demoMode()) {
      existingCount = (demoNotifications.get(farmerId) || []).length;
    } else {
      existingCount = await Notification.countDocuments({ farmer: farmerId });
    }

    if (existingCount > 0) return;

    const currentMonth = new Date().getMonth() + 1;
    const monthCrops = crops.filter((crop) => crop.sowMonths.includes(currentMonth));
    const monthName = new Date().toLocaleString("en", { month: "long" });

    // 1. Sowing reminder
    if (monthCrops.length > 0) {
      const cropNames = monthCrops.map((c) => c.name);
      await createNotification(farmerId, {
        title: `Upcoming Sowing Window: ${cropNames.slice(0, 2).join(", ")}`,
        description: `${monthName} is an active sowing window for ${cropNames.join(", ")} in Karnataka. Check seed viability and field moisture.`,
        type: "sowing"
      });
    }

    // 2. Crop calendar reminder
    await createNotification(farmerId, {
      title: `Crop Calendar: ${monthName} Priorities`,
      description: `Review field drainage, monitor vegetative growth stages, and plan nutrient management based on local soil conditions.`,
      type: "calendar"
    });

    // 3. Pest protection reminder
    await createNotification(farmerId, {
      title: "Pest Protection Advisory",
      description: "Scout fields twice a week for stem borer, pod borer, or leaf curl symptoms. Consult your local KVK before applying any chemical spray.",
      type: "pest"
    });

    // 4. Weather notification: ONLY if real weather data is available
    if (farmer.district) {
      try {
        const weather = await getWeather({ district: farmer.district, taluk: farmer.taluk });
        if (weather?.available && weather.daily) {
          const rainProb = weather.daily.precipitation_probability_max?.[0] ?? 0;
          const rainAmount = weather.daily.precipitation_sum?.[0] ?? 0;
          if (rainProb > 40 || rainAmount > 2) {
            await createNotification(farmerId, {
              title: `Weather Alert: Rain in ${weather.location}`,
              description: `Forecast indicates ${rainProb}% chance of rain (${rainAmount} mm). Adjust irrigation and postpone pesticide spraying if required.`,
              type: "weather"
            });
          }
        }
      } catch {}
    }
  } catch (err) {
    console.error("Error seeding notifications:", err.message);
  }
}

// Multer storage for profile photos
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(__dirname, "../uploads/profiles");
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const farmerId = req.farmerId || "farmer";
    cb(null, `farmer-${farmerId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Please upload a valid image file (JPEG, PNG, or WebP)."));
    }
  }
});

// ==========================================
// 1. AUTHENTICATION (NO OTP - PROTOTYPE)
// ==========================================

// Returning user login: Mobile number only
router.post("/auth/login", async (req, res, next) => {
  try {
    const phone = phoneKey(String(req.body.phone || ""));
    if (!validPhone(phone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
    }

    const farmer = demoMode()
      ? demoFarmers.get(phone)
      : await Farmer.findOne({ phone });

    if (!farmer) {
      return res.status(404).json({
        error: "This mobile number is not registered yet. Please create a new farmer profile.",
        notRegistered: true,
        phone
      });
    }

    const token = issueToken(farmer);
    const farmerId = farmer._id?.toString() || farmer.id || farmer._id;

    // Log login activity
    await logActivity(farmerId, {
      activityType: "login",
      title: "Farmer Signed In",
      details: `Signed in using registered mobile ${phone}`,
      status: "completed"
    });

    // Ensure notifications exist
    await seedFarmerNotifications(farmer);

    res.json({
      token,
      farmer: normalizedFarmer(farmer),
      message: "Welcome back to CropWise."
    });
  } catch (error) { next(error); }
});

// First-time registration
router.post("/auth/register", async (req, res, next) => {
  try {
    const phone = phoneKey(String(req.body.phone || ""));
    if (!validPhone(phone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
    }

    const name = String(req.body.name || "").trim();
    const district = locations.find((item) => item.id === req.body.districtId);
    const taluk = district?.taluks.find((item) => item.id === req.body.talukId);
    const village = String(req.body.village || "").trim();

    if (name.length < 2) {
      return res.status(400).json({ error: "Please enter your full name (at least 2 characters)." });
    }
    if (!district || !taluk) {
      return res.status(400).json({ error: "Please select a valid district and taluk." });
    }

    // Check for duplicate registration
    const existing = demoMode()
      ? demoFarmers.get(phone)
      : await Farmer.findOne({ phone });

    if (existing) {
      return res.status(409).json({
        error: "This mobile number is already registered. Please sign in directly.",
        alreadyRegistered: true
      });
    }

    const farmerData = {
      phone,
      name,
      districtId: district.id,
      district: district.name,
      talukId: taluk.id,
      taluk: taluk.name,
      village,
      soils: [],
      landArea: 1,
      waterAvailability: "medium",
      photoUrl: "",
      language: req.body.language || "en"
    };

    let farmer;
    if (demoMode()) {
      farmer = { ...farmerData, _id: phone, id: phone, createdAt: new Date() };
      demoFarmers.set(phone, farmer);
    } else {
      farmer = await Farmer.create(farmerData);
    }

    const farmerId = farmer._id?.toString() || farmer.id || farmer._id;
    const token = issueToken(farmer);

    // Initial registration activity
    await logActivity(farmerId, {
      activityType: "profile_updated",
      title: "Farmer Account Registered",
      details: `Registered in ${district.name}, ${taluk.name}${village ? `, village: ${village}` : ""}`,
      status: "completed"
    });

    // Welcome notification
    await createNotification(farmerId, {
      title: "Welcome to CropWise! / ಕ್ರಾಪ್‌ವೈಸ್‌ಗೆ ಸುಸ್ವಾಗತ!",
      description: "Your farmer profile is ready. Start by exploring crop recommendations tailored to your region.",
      type: "general"
    });

    // Context notifications
    await seedFarmerNotifications(farmer);

    res.status(201).json({
      token,
      farmer: normalizedFarmer(farmer),
      message: "Farmer account created successfully."
    });
  } catch (error) { next(error); }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

router.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    const farmer = await farmerLookup(req.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer profile was not found. Please sign in again." });
    res.json({ farmer: normalizedFarmer(farmer), persistent: !demoMode() });
  } catch (error) { next(error); }
});

// ==========================================
// 2. FARMER PROFILE & PHOTO
// ==========================================

router.get("/farmers/profile", requireAuth, async (req, res, next) => {
  try {
    const farmer = await farmerLookup(req.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer profile was not found." });
    res.json({ farmer: normalizedFarmer(farmer), persistent: !demoMode() });
  } catch (error) { next(error); }
});

router.put("/farmers/profile", requireAuth, async (req, res, next) => {
  try {
    const farmer = await farmerLookup(req.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer profile was not found." });

    const { name, districtId, talukId, village, soils: selectedSoils, landArea, waterAvailability, soilPh, language } = req.body;
    const district = districtId ? locations.find((item) => item.id === districtId) : null;
    const taluk = district?.taluks.find((item) => item.id === talukId);

    if (districtId && !taluk) return res.status(400).json({ error: "Select a taluk from the selected district." });
    if (selectedSoils && (!Array.isArray(selectedSoils) || selectedSoils.some((soil) => !soils.includes(soil)))) {
      return res.status(400).json({ error: "Choose one or more valid soil types." });
    }
    if (landArea != null && (!Number.isFinite(Number(landArea)) || Number(landArea) <= 0)) {
      return res.status(400).json({ error: "Farm area must be a positive number." });
    }
    if (waterAvailability && !["low", "medium", "high"].includes(waterAvailability)) {
      return res.status(400).json({ error: "Select a valid water availability." });
    }
    if (soilPh != null && soilPh !== "" && (!Number.isFinite(Number(soilPh)) || Number(soilPh) < 0 || Number(soilPh) > 14)) {
      return res.status(400).json({ error: "Soil pH must be between 0 and 14." });
    }

    const changes = {
      ...(name ? { name: String(name).trim() } : {}),
      ...(district ? { districtId: district.id, district: district.name, talukId: taluk.id, taluk: taluk.name } : {}),
      ...(village !== undefined ? { village: String(village).trim() } : {}),
      ...(selectedSoils ? { soils: selectedSoils } : {}),
      ...(landArea != null ? { landArea: Number(landArea) } : {}),
      ...(waterAvailability ? { waterAvailability } : {}),
      soilPh: soilPh == null || soilPh === "" ? undefined : Number(soilPh),
      ...(language && ["en", "kn"].includes(language) ? { language } : {})
    };

    Object.assign(farmer, changes);
    if (!demoMode()) await farmer.save();

    // Log activity
    await logActivity(req.farmerId, {
      activityType: "profile_updated",
      title: "Farm Profile Updated",
      details: `Updated details: ${farmer.taluk || ""}, ${farmer.district || ""}, ${farmer.landArea || 1} acres`,
      status: "completed"
    });

    res.json({ farmer: normalizedFarmer(farmer), persistent: !demoMode() });
  } catch (error) { next(error); }
});

router.post("/farmers/profile/photo", requireAuth, upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please select an image file to upload (JPEG, PNG, or WebP)." });
    }
    const farmer = await farmerLookup(req.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer profile was not found." });

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    farmer.photoUrl = photoUrl;
    if (!demoMode()) await farmer.save();

    await logActivity(req.farmerId, {
      activityType: "photo_uploaded",
      title: "Profile Photo Updated",
      details: "Uploaded a new profile picture",
      status: "completed"
    });

    res.json({
      photoUrl,
      farmer: normalizedFarmer(farmer),
      message: "Profile photo uploaded successfully."
    });
  } catch (error) { next(error); }
});

// ==========================================
// 3. NOTIFICATIONS
// ==========================================

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    let list;
    if (demoMode()) {
      list = demoNotifications.get(req.farmerId) || [];
    } else {
      list = await Notification.find({ farmer: req.farmerId }).sort({ createdAt: -1 });
    }
    res.json({ notifications: list });
  } catch (error) { next(error); }
});

router.patch("/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    if (demoMode()) {
      const list = demoNotifications.get(req.farmerId) || [];
      const item = list.find((n) => (n._id?.toString() || n.id) === req.params.id);
      if (!item) return res.status(404).json({ error: "Notification not found." });
      item.read = true;
      return res.json({ notification: item });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, farmer: req.farmerId },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found." });
    res.json({ notification });
  } catch (error) { next(error); }
});

router.patch("/notifications/read-all", requireAuth, async (req, res, next) => {
  try {
    if (demoMode()) {
      const list = demoNotifications.get(req.farmerId) || [];
      list.forEach((n) => (n.read = true));
      return res.json({ success: true, count: list.length });
    }
    const result = await Notification.updateMany({ farmer: req.farmerId, read: false }, { read: true });
    res.json({ success: true, count: result.modifiedCount });
  } catch (error) { next(error); }
});

router.delete("/notifications", requireAuth, async (req, res, next) => {
  try {
    if (demoMode()) {
      demoNotifications.set(req.farmerId, []);
      return res.json({ success: true, message: "Notifications cleared." });
    }
    await Notification.deleteMany({ farmer: req.farmerId });
    res.json({ success: true, message: "Notifications cleared." });
  } catch (error) { next(error); }
});

// ==========================================
// 4. FARMER ACTIVITY HISTORY
// ==========================================

router.get("/activities", requireAuth, async (req, res, next) => {
  try {
    let list;
    if (demoMode()) {
      list = demoActivities.get(req.farmerId) || [];
    } else {
      list = await Activity.find({ farmer: req.farmerId }).sort({ createdAt: -1 });
    }
    res.json({ activities: list });
  } catch (error) { next(error); }
});

router.post("/activities", requireAuth, async (req, res, next) => {
  try {
    const { activityType, title, cropName, details, status, metadata } = req.body;
    if (!title) return res.status(400).json({ error: "Activity title is required." });
    const activity = await logActivity(req.farmerId, {
      activityType: activityType || "general",
      title,
      cropName: cropName || "",
      details: details || "",
      status: status || "completed",
      metadata: metadata || {}
    });
    res.status(201).json({ activity });
  } catch (error) { next(error); }
});

router.get("/activities/:id", requireAuth, async (req, res, next) => {
  try {
    if (demoMode()) {
      const list = demoActivities.get(req.farmerId) || [];
      const item = list.find((a) => (a._id?.toString() || a.id) === req.params.id);
      if (!item) return res.status(404).json({ error: "Activity not found." });
      return res.json({ activity: item });
    }
    const activity = await Activity.findOne({ _id: req.params.id, farmer: req.farmerId });
    if (!activity) return res.status(404).json({ error: "Activity not found." });
    res.json({ activity });
  } catch (error) { next(error); }
});

// ==========================================
// 5. CROPS, RECOMMENDATIONS & WEATHER
// ==========================================

router.get("/locations/districts", (_req, res) =>
  res.json({ districts: locations.map(({ id, name }) => ({ id, name })) })
);

router.get("/locations/districts/:districtId/taluks", (req, res) => {
  const district = locations.find((item) => item.id === req.params.districtId);
  if (!district) return res.status(404).json({ error: "District not found." });
  res.json({ taluks: district.taluks });
});

router.get("/locations/taluks/:talukId/soils", (req, res) => {
  const found = locations.some((district) => district.taluks.some((taluk) => taluk.id === req.params.talukId));
  if (!found) return res.status(404).json({ error: "Taluk not found." });
  res.json({ soils: soils.map((name) => ({ id: name, name, note: "General soil category; confirm with a soil test." })) });
});

router.get("/crops", (_req, res) =>
  res.json({
    crops: crops.map(({ name, soils: soilTypes, water, duration, season, yieldPerAcre, costPerAcre, price, risk }) => ({
      name, soils: soilTypes, water, duration, season, yieldPerAcre, costPerAcre, priceAssumptionPerQuintal: price, risk
    }))
  })
);

router.post("/crops/recommend", async (req, res) => {
  const recommendations = recommend(req.body);
  // Log activity if auth token provided
  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.replace(/^Bearer\s+/i, "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "cropwise-local-demo-secret");
      if (decoded.sub) {
        logActivity(decoded.sub, {
          activityType: "crop_recommendation",
          title: "Explored Crop Recommendations",
          details: `Generated ${recommendations.length} suitable crop shortlists based on conditions`,
          status: "completed"
        });
      }
    } catch {}
  }
  res.json({
    recommendations,
    explanation: "Transparent indicative ranking using soil match, water match, rainfall suitability, sowing/season match and lower crop risk."
  });
});

router.post("/crops/compare", (req, res) => {
  const names = Array.isArray(req.body.crops) ? req.body.crops : [];
  if (names.length < 2 || names.length > 5) {
    return res.status(400).json({ error: "Choose between two and five crops to compare." });
  }
  const results = recommend(req.body).filter((crop) => names.includes(crop.name));
  if (results.length !== names.length) {
    return res.status(400).json({ error: "One or more selected crops were not found." });
  }

  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.replace(/^Bearer\s+/i, "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "cropwise-local-demo-secret");
      if (decoded.sub) {
        logActivity(decoded.sub, {
          activityType: "crop_comparison",
          title: "Compared Crops",
          cropName: names.join(", "),
          details: `Side-by-side simulation for ${names.join(", ")}`,
          status: "completed"
        });
      }
    } catch {}
  }

  res.json({ crops: results });
});

router.post("/crops/simulate", (req, res) =>
  res.json({ recommendations: recommend(req.body), changedInputs: req.body })
);

router.post("/crops/diversify", (req, res) => {
  const totalArea = Number(req.body.landArea ?? 1);
  if (!Number.isFinite(totalArea) || totalArea <= 0) {
    return res.status(400).json({ error: "Farm area must be a positive number." });
  }
  const shortlist = recommend({ ...req.body, landArea: totalArea }).filter((crop) => crop.score >= 45).slice(0, 3);
  if (shortlist.length < 2) {
    return res.json({ available: false, crops: [], reason: "There are not enough suitable options to suggest a diversified plan." });
  }
  const baseArea = Math.floor((totalArea / shortlist.length) * 100) / 100;
  const allocations = shortlist.map((crop, index) => {
    const area = index === shortlist.length - 1 ? Number((totalArea - baseArea * index).toFixed(2)) : baseArea;
    return {
      name: crop.name,
      score: crop.score,
      area,
      share: Number((area / totalArea * 100).toFixed(1)),
      water: crop.water,
      risk: crop.risk,
      estimatedProfit: Math.round(crop.profit / totalArea * area)
    };
  });
  res.json({
    available: true,
    totalArea,
    crops: allocations,
    explanation: "Illustrative equal-area split across highest-ranked options to balance risk."
  });
});

router.get("/weather", async (req, res, next) => {
  try {
    res.json(await getWeather({ district: String(req.query.district || ""), taluk: String(req.query.taluk || "") }));
  } catch (error) { next(error); }
});

router.get("/weather/forecast", async (req, res, next) => {
  try {
    res.json(await getWeather({ district: String(req.query.district || ""), taluk: String(req.query.taluk || "") }));
  } catch (error) { next(error); }
});

router.get("/market/prices", async (req, res, next) => {
  try {
    res.json(await getMarketPrices({ crop: req.query.crop, district: req.query.district }));
  } catch (error) { next(error); }
});

router.get("/market/trends", async (req, res, next) => {
  try {
    const result = await getMarketPrices({ crop: req.query.crop, district: req.query.district });
    res.json({ ...result, trends: result.prices.slice(-30) });
  } catch (error) { next(error); }
});

router.get("/calendar", (_req, res) =>
  res.json({
    months: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthCrops = crops.filter((crop) => crop.sowMonths.includes(month));
      const activities = monthCrops.length
        ? ["Prepare land and review field moisture", "Choose locally suitable seed", "Sow only when soil temperature and moisture match", "Plan irrigation around rainfall", "Apply nutrients based on soil tests", "Monitor for early pest infestation", "Plan harvest at physiological maturity"]
        : ["Review field conditions and crop growth stage", "Maintain field hygiene and inspect for pest vectors", "Plan next season's crop rotation with local extension"];
      return {
        month,
        name: new Date(new Date().getFullYear(), index, 1).toLocaleString("en", { month: "long" }),
        activities,
        crops: monthCrops.map((crop) => crop.name)
      };
    })
  })
);

router.get("/calendar/:crop", (req, res) => {
  const crop = crops.find((item) => item.name.toLowerCase() === req.params.crop.toLowerCase());
  if (!crop) return res.status(404).json({ error: "Crop not found." });

  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.replace(/^Bearer\s+/i, "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "cropwise-local-demo-secret");
      if (decoded.sub) {
        logActivity(decoded.sub, {
          activityType: "calendar_viewed",
          title: `Viewed Crop Calendar: ${crop.name}`,
          cropName: crop.name,
          details: `Duration: ${crop.duration} days, sowing months: ${crop.sowMonths.join(", ")}`,
          status: "completed"
        });
      }
    } catch {}
  }

  res.json({ crop: crop.name, sowingMonths: crop.sowMonths, durationDays: crop.duration, note: "General reference sowing schedule." });
});

// ==========================================
// 6. SAVED CROP PLANS
// ==========================================

router.get("/plans", requireAuth, async (req, res, next) => {
  try {
    res.json({ plans: demoMode() ? demoPlans.get(req.farmerId) || [] : await CropPlan.find({ farmer: req.farmerId }).sort({ createdAt: -1 }) });
  } catch (error) { next(error); }
});

router.post("/plans", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const selectedCrops = Array.isArray(req.body.crops) ? req.body.crops.filter((crop) => crops.some((item) => item.name === crop)) : [];
    if (!name || selectedCrops.length === 0) {
      return res.status(400).json({ error: "Add a plan name and at least one valid crop." });
    }
    const planData = {
      name,
      crops: selectedCrops,
      area: Number(req.body.area) || 1,
      season: req.body.season || "Kharif",
      notes: String(req.body.notes || "").slice(0, 500),
      simulation: req.body.simulation || {}
    };

    let plan;
    if (demoMode()) {
      const plans = demoPlans.get(req.farmerId) || [];
      plan = { ...planData, _id: `plan_${Date.now()}`, createdAt: new Date().toISOString() };
      plans.unshift(plan);
      demoPlans.set(req.farmerId, plans);
    } else {
      plan = await CropPlan.create({ ...planData, farmer: req.farmerId });
    }

    // Log activity
    await logActivity(req.farmerId, {
      activityType: "crop_plan_saved",
      title: `Saved Plan: ${name}`,
      cropName: selectedCrops.join(", "),
      details: `Saved plan covering ${selectedCrops.join(", ")} for ${planData.area} acre(s)`,
      status: "saved",
      metadata: { planId: plan._id?.toString() || plan.id }
    });

    res.status(201).json({ plan });
  } catch (error) { next(error); }
});

router.delete("/plans/:id", requireAuth, async (req, res, next) => {
  try {
    if (demoMode()) {
      const plans = demoPlans.get(req.farmerId) || [];
      const updated = plans.filter((plan) => (plan._id || plan.id) !== req.params.id);
      if (updated.length === plans.length) return res.status(404).json({ error: "Saved plan was not found." });
      demoPlans.set(req.farmerId, updated);
    } else {
      const result = await CropPlan.deleteOne({ _id: req.params.id, farmer: req.farmerId });
      if (!result.deletedCount) return res.status(404).json({ error: "Saved plan was not found." });
    }
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

// ==========================================
// 7. ASSISTANT
// ==========================================

router.get("/assistant/history", requireAuth, async (req, res, next) => {
  try {
    if (demoMode()) return res.json({ messages: demoChats.get(req.farmerId) || [] });
    const history = await ChatHistory.findOne({ farmer: req.farmerId });
    res.json({ messages: history?.messages || [] });
  } catch (error) { next(error); }
});

router.post("/assistant/chat", requireAuth, async (req, res, next) => {
  try {
    const message = String(req.body.message || "").trim();
    if (!message || message.length > 1000) {
      return res.status(400).json({ error: "Enter a message of up to 1,000 characters." });
    }
    const farmer = await farmerLookup(req.farmerId);
    const context = {
      district: farmer?.district,
      taluk: farmer?.taluk,
      soils: farmer?.soils,
      waterAvailability: farmer?.waterAvailability,
      season: req.body.season,
      language: req.body.language || farmer?.language || "en",
      weather: req.body.weather,
      recommendations: req.body.recommendations
    };
    const answer = await answerAssistant(message, context);
    const additions = [{ role: "user", content: message }, { role: "assistant", content: answer.text }];

    if (demoMode()) {
      const history = demoChats.get(req.farmerId) || [];
      demoChats.set(req.farmerId, [...history, ...additions].slice(-60));
    } else {
      await ChatHistory.findOneAndUpdate(
        { farmer: req.farmerId },
        { $push: { messages: { $each: additions, $slice: -60 } } },
        { upsert: true, new: true }
      );
    }

    // Log AI interaction
    await logActivity(req.farmerId, {
      activityType: "ai_conversation",
      title: "CropWise Assistant Consultation",
      details: `Asked: "${message.slice(0, 60)}${message.length > 60 ? "..." : ""}"`,
      status: "completed"
    });

    res.json(answer);
  } catch (error) { next(error); }
});

export default router;
