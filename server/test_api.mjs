import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const BASE_URL = "http://localhost:5000/api";
const client = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

async function runTests() {
  console.log("=== STARTING CROPWISE BACKEND & API TESTS ===\n");
  let passed = 0;
  let failed = 0;

  // Generate dynamic phone numbers for idempotent re-runs
  const randSuffix = Math.floor(10000 + Math.random() * 90000);
  const testPhone1 = `98765${randSuffix}`;
  const testPhone2 = `91234${randSuffix}`;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error("   Error:", err.message);
      failed++;
    }
  }

  // 1. Health check
  await test("GET /api/health", async () => {
    const res = await client.get("/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "ok");
  });

  // 2. Unregistered phone login failure
  await test("POST /api/auth/login fails for unregistered phone with 404 & link flag", async () => {
    const res = await client.post("/auth/login", { phone: "9000000001" });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.notRegistered, true);
    assert.ok(res.data.error.includes("not registered"));
  });

  // 3. Register Farmer 1
  let token1 = "";
  let farmer1Id = "";
  await test("POST /api/auth/register creates new farmer with village and returns JWT", async () => {
    const distRes = await client.get("/locations/districts");
    const mysuru = distRes.data.districts.find((d) => d.name === "Mysuru");
    const talukRes = await client.get(`/locations/districts/${mysuru.id}/taluks`);
    const taluk = talukRes.data.taluks[0];

    const res = await client.post("/auth/register", {
      phone: testPhone1,
      name: "Ramesh Gowda",
      districtId: mysuru.id,
      talukId: taluk.id,
      village: "Hinkal"
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.token);
    assert.strictEqual(res.data.farmer.name, "Ramesh Gowda");
    assert.strictEqual(res.data.farmer.village, "Hinkal");
    assert.strictEqual(res.data.farmer.district, "Mysuru");
    assert.strictEqual(res.data.farmer.taluk, taluk.name);
    token1 = res.data.token;
    farmer1Id = res.data.farmer.id;
  });

  // 4. Duplicate registration check
  await test("POST /api/auth/register prevents duplicate phone registration", async () => {
    const res = await client.post("/auth/register", {
      phone: testPhone1,
      name: "Duplicate User",
      districtId: "ka-22",
      talukId: "ka-22-t1"
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.alreadyRegistered, true);
  });

  // 5. Login Farmer 1 (Mobile number only, NO OTP!)
  await test("POST /api/auth/login logs in existing farmer with mobile number only", async () => {
    const res = await client.post("/auth/login", { phone: testPhone1 });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.token);
    assert.strictEqual(res.data.farmer.name, "Ramesh Gowda");
    token1 = res.data.token;
    farmer1Id = res.data.farmer.id;
  });

  // 6. GET /api/auth/me
  await test("GET /api/auth/me returns authenticated farmer details", async () => {
    const res = await client.get("/auth/me", {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.farmer.id, farmer1Id);
    assert.strictEqual(res.data.farmer.name, "Ramesh Gowda");
  });

  // 7. Profile editing PUT /api/farmers/profile
  await test("PUT /api/farmers/profile updates profile and immediately returns updated data", async () => {
    const res = await client.put(
      "/farmers/profile",
      {
        name: "Ramesh K. Gowda",
        village: "Hinkal North",
        soils: ["red", "loamy"],
        landArea: 3.5,
        waterAvailability: "high",
        soilPh: 6.8
      },
      { headers: { Authorization: `Bearer ${token1}` } }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.farmer.name, "Ramesh K. Gowda");
    assert.strictEqual(res.data.farmer.village, "Hinkal North");
    assert.strictEqual(res.data.farmer.landArea, 3.5);
    assert.strictEqual(res.data.farmer.waterAvailability, "high");
    assert.strictEqual(res.data.farmer.soilPh, 6.8);
    assert.deepStrictEqual(res.data.farmer.soils, ["red", "loamy"]);
    assert.strictEqual(res.data.farmer.profileComplete, true);
  });

  // 8. Profile Photo Upload POST /api/farmers/profile/photo
  await test("POST /api/farmers/profile/photo validates and stores profile photo", async () => {
    const tinyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("photo", tinyPng, { filename: "profile.png", contentType: "image/png" });

    const res = await client.post("/farmers/profile/photo", form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token1}`
      }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.photoUrl);
    assert.ok(res.data.photoUrl.startsWith("/uploads/profiles/"));
    assert.strictEqual(res.data.farmer.photoUrl, res.data.photoUrl);

    // Verify static serving of uploaded file
    const staticRes = await axios.get(`http://localhost:5000${res.data.photoUrl}`);
    assert.strictEqual(staticRes.status, 200);
  });

  // 9. Notifications GET /api/notifications
  let notifId = "";
  await test("GET /api/notifications returns seeded context-driven notifications", async () => {
    const res = await client.get("/notifications", {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.notifications));
    assert.ok(res.data.notifications.length > 0);
    notifId = res.data.notifications[0]._id || res.data.notifications[0].id;
    console.log(`   (Seeded ${res.data.notifications.length} notifications: ${res.data.notifications.map((n) => n.type).join(", ")})`);
  });

  // 10. Mark single notification as read
  await test("PATCH /api/notifications/:id/read marks notification as read", async () => {
    const res = await client.patch(
      `/notifications/${notifId}/read`,
      {},
      { headers: { Authorization: `Bearer ${token1}` } }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.notification.read, true);
  });

  // 11. Mark all notifications as read
  await test("PATCH /api/notifications/read-all marks all notifications as read", async () => {
    const res = await client.patch(
      "/notifications/read-all",
      {},
      { headers: { Authorization: `Bearer ${token1}` } }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  // 12. Activity History GET /api/activities
  await test("GET /api/activities records previous login, profile updates and photo uploads", async () => {
    const res = await client.get("/activities", {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.activities));
    assert.ok(res.data.activities.length >= 3);
    console.log(`   (Found ${res.data.activities.length} recorded activities: ${res.data.activities.map((a) => a.activityType).join(", ")})`);
  });

  // 13. Create & Save a Crop Plan
  await test("POST /api/plans saves a crop plan and logs crop_plan_saved activity", async () => {
    const res = await client.post(
      "/plans",
      {
        name: "Mysuru Kharif 2026 Plan",
        crops: ["Ragi", "Maize"],
        area: 3.5,
        season: "Kharif"
      },
      { headers: { Authorization: `Bearer ${token1}` } }
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.plan.name, "Mysuru Kharif 2026 Plan");

    // Check activity was created
    const actRes = await client.get("/activities", {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const planAct = actRes.data.activities.find((a) => a.activityType === "crop_plan_saved");
    assert.ok(planAct);
    assert.ok(planAct.cropName.includes("Ragi"));
  });

  // 14. Cross-Farmer Isolation Test
  await test("Cross-Farmer isolation: Farmer 2 cannot access Farmer 1's profile, plans or notifications", async () => {
    const res2 = await client.post("/auth/register", {
      phone: testPhone2,
      name: "Suresh Patil",
      districtId: "ka-03", // Belagavi
      talukId: "ka-03-t1",
      village: "Athani Village"
    });
    assert.strictEqual(res2.status, 201);
    const token2 = res2.data.token;

    // Check Farmer 2's profile
    const profile2 = await client.get("/farmers/profile", {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(profile2.data.farmer.name, "Suresh Patil");
    assert.notStrictEqual(profile2.data.farmer.id, farmer1Id);

    // Check Farmer 2's plans (should be 0)
    const plans2 = await client.get("/plans", {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(plans2.data.plans.length, 0);

    // Check Farmer 2's activities (should not contain Farmer 1's activities)
    const acts2 = await client.get("/activities", {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const hasFarmer1Plan = acts2.data.activities.some((a) => a.title.includes("Mysuru Kharif"));
    assert.strictEqual(hasFarmer1Plan, false);
  });

  // 15. Persistence after logout and re-login
  await test("Persistence: Logging out and logging in again reloads profile, photo, plans and history", async () => {
    // Logout
    await client.post("/auth/logout", {}, { headers: { Authorization: `Bearer ${token1}` } });

    // Login again with mobile number only
    const loginRes = await client.post("/auth/login", { phone: testPhone1 });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.farmer.name, "Ramesh K. Gowda");
    assert.strictEqual(loginRes.data.farmer.village, "Hinkal North");
    assert.strictEqual(loginRes.data.farmer.landArea, 3.5);
    assert.ok(loginRes.data.farmer.photoUrl);

    const reToken = loginRes.data.token;

    // Verify plans are still there
    const plansRes = await client.get("/plans", { headers: { Authorization: `Bearer ${reToken}` } });
    assert.strictEqual(plansRes.data.plans.length, 1);
    assert.strictEqual(plansRes.data.plans[0].name, "Mysuru Kharif 2026 Plan");

    // Verify activity history persists
    const actsRes = await client.get("/activities", { headers: { Authorization: `Bearer ${reToken}` } });
    assert.ok(actsRes.data.activities.length >= 4);
  });

  // 16. Clear notifications
  await test("DELETE /api/notifications clears all notifications for farmer", async () => {
    const res = await client.delete("/notifications", {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    const checkRes = await client.get("/notifications", {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(checkRes.data.notifications.length, 0);
  });

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
