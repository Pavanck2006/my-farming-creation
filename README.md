# Namma Krishi – Profile, Notifications and Login Improvements

> **Problem Statement ID:** DL-SJBIT-HK26-AGR006  
> **Platform:** MERN Stack (MongoDB, Express, React, Node.js + Vite & TailwindCSS)

Namma Krishi is an intelligent, farmer-friendly decision engine and crop simulator built specifically for Karnataka's farming community. It offers transparent crop suitability scoring, multi-crop trade-off simulation, Open-Meteo weather integration, seasonal crop calendars, pest monitoring advisories, AI assistance, and comprehensive farming activity tracking.

---

## ⚠️ Important Hackathon Prototype Security Note

> **CRITICAL NOTICE:**
> For this hackathon prototype, **OTP-based SMS verification has been removed** in favor of a simple, frictionless mobile-number-based login.
> - **First-time registration:** Requires the farmer's mobile number, full name, district, taluk, and optional village.
> - **Returning login:** Requires **only the registered mobile number**, returning a signed JWT session.
> 
> **Production Limitation:** Mobile-number-only login is **NOT secure enough for production**. Entering or possessing a mobile phone number alone does not prove the user's identity. In a production release, SMS OTP verification (e.g., Twilio Verify), multi-factor authentication (MFA), or cryptographic authentication must be re-enabled.

---

## Key Improvements & Implemented Features

### 1. Farmer Profile Button & Profile Dropdown
- **Top-Left Sidebar & Topbar Profile Access:** Clicking the farmer profile card at the top-left of the sidebar or the avatar button on the topbar opens a comprehensive profile dropdown.
- **Dropdown Overview:** Displays farmer photo/avatar, full name, registered mobile number, village, taluk, district, and a visual profile completion progress bar.
- **Photo Upload & Cloud/Disk Storage:** Farmers can upload or change their profile picture (`JPEG`, `PNG`, `WebP`, max 5 MB). Uploads are stored on disk in `server/uploads/profiles/` and served statically via Express (`/uploads/...`), preventing large binary blobs in MongoDB.
- **Profile Page (`/app/profile`):** Allows farmers to view and edit their name, mobile, district, taluk, village, farm size (acres), soil types (multi-select), water availability (limited, moderate, reliable), soil pH, and language preference.
- **Profile Completion Notice:** A smart alert warns the farmer if crucial attributes (village, soil types, farm area) are missing.
- **Immediate State Synchronization & Persistence:** Profile updates and photo uploads are immediately reflected throughout the app (sidebar, topbar, dashboard, chat) and stored in MongoDB (or in-memory store in demo mode).

### 2. Working Notification Bell & Dropdown
- **Top-Right Bell Icon:** Dynamic unread badge counter showing the number of unread alerts.
- **Notification Dropdown Panel:**
  - Displays title, description, category badge, and formatted timestamp.
  - Category types: **Sowing reminders**, **Crop calendar tasks**, **Real weather alerts**, and **Pest protection advisories**.
  - **Mark as read:** Click individual notification to mark read.
  - **Mark all as read:** Working `PATCH /api/notifications/read-all` button.
  - **Clear all:** Working `DELETE /api/notifications` button.
  - **Empty state:** Clean empty state illustration when there are no alerts.
- **Authentic Data Only:** Weather notifications are generated **only when real Open-Meteo weather data** indicates significant precipitation (> 40% probability or > 2mm rain). No fake weather alerts or fabricated market notifications are created.

### 3. Dark Agricultural Green Navigation Sidebar
- **Theme:** Styled with a deep, rich dark agricultural green background (`#143319`), white/cream text (`#edf4ec`), and clear agricultural glyphs.
- **Active Navigation Highlight:** Light green active state (`#275e30`) with high-contrast indicator (`#84f37e`).
- **Smooth Hovers & Transitions:** Accessible contrast on both desktop and mobile drawer views.
- **Main Content:** Clean, light page background (`#f5f7f1`) keeping data tables and charts easy to read.
- **Sidebar Navigation Links:**
  1. Overview (`/app`)
  2. Crop planner (`/app/recommendations`)
  3. Compare & simulate (`/app/simulator`)
  4. Weather (`/app/weather`)
  5. Market prices (`/app/market`)
  6. Crop calendar (`/app/calendar`)
  7. Crop protection (`/app/protection`)
  8. AI assistant (`/app/assistant`)
  9. Saved plans (`/app/plans`)
  10. Farming history (`/app/history`)
  11. Farm profile & settings (`/app/profile`)

### 4. Simple Mobile-Number Login (No OTP)
- **Returning User Login (`/login`):**
  - Farmer enters only their 10-digit mobile number.
  - If registered, generates a JWT token and loads the farmer dashboard.
  - If unregistered, returns a clear error message with a direct button to "Register as a New Farmer".
- **First-Time Registration (`/register`):**
  - Asks for Mobile Number, Farmer Name, District, Taluk, and Village.
  - Validates phone format and prevents duplicate registrations with an informative error.

### 5. Farmer Activity History ("My Farming History")
- **Tracked Activities:**
  - Crop recommendations viewed
  - Crops compared and simulated
  - Crop plans saved and created
  - Farm profile and soil updates
  - Profile photo uploads
  - AI assistant consultations
  - Crop calendar views
  - Farmer sign-ins
- **Dashboard Widget:** Displays the 4 most recent activities directly on the dashboard.
- **Dedicated History Page (`/app/history`):** Complete searchable and filterable table with Activity Name, Crop Badge, Timestamp, Details, Status, and Action buttons (e.g., "Open Plan", "Re-simulate").
- **Farmer Isolation:** Activities and plans are strictly associated with the authenticated farmer's unique database ID.

### 6. Bilingual Kannada & English Support
- Seamless one-click switching between English (`EN`) and Kannada (`ಕನ್ನಡ`).
- Translates sidebar items, topbar controls, profile forms, notifications, and activity history.

---

## Project Structure

```
cropwise/
├── client/
│   ├── src/
│   │   ├── context/
│   │   │   └── AppContext.jsx       # Auth context, theme, language state
│   │   ├── services/
│   │   │   └── api.js              # Axios instance with JWT interceptor
│   │   ├── App.jsx                 # Main application, pages, navigation, dropdowns
│   │   ├── main.jsx                # React root entry
│   │   └── styles.css              # Dark green sidebar, dropdown & responsive styles
│   ├── index.html
│   └── package.json
├── server/
│   ├── config/
│   │   └── db.js                   # MongoDB connection logic
│   ├── data/
│   │   ├── crops.js                # Crop reference data with soil/water requirements
│   │   └── locations.js            # 31 Karnataka districts and taluks
│   ├── middleware/
│   │   └── auth.js                 # JWT requireAuth verification middleware
│   ├── models/
│   │   └── index.js                # Farmer, Notification, Activity, CropPlan models
│   ├── routes/
│   │   └── api.js                  # Auth, Profile, Photo, Notification & Activity APIs
│   ├── uploads/
│   │   └── profiles/               # Uploaded farmer profile photos
│   ├── utils/
│   │   └── otp.js                  # Store utilities, demo fallback maps, phone parsing
│   ├── index.js                    # Express app, static routes, error handlers
│   ├── test_api.mjs                # Comprehensive backend integration test suite
│   ├── .env                        # Local environment settings
│   └── package.json
└── package.json
```

---

## Getting Started

### 1. Prerequisites
- **Node.js:** v20+ (tested on Node v26)
- **MongoDB:** (Optional for development / hackathon demo mode; recommended for persistent storage)

### 2. Installation
```powershell
# Navigate into cropwise directory
cd cropwise

# Install workspace dependencies
npm install
```

### 3. Environment Setup
The server reads configuration from `cropwise/server/.env`:
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=
JWT_SECRET=cropwise-hackathon-secure-prototype-secret-2026
```
- If `MONGODB_URI` is left empty, the application automatically runs in an in-memory demo mode where all models (Farmer, Notifications, Activities, Crop Plans) are preserved during the server run.
- To use persistent MongoDB, set `MONGODB_URI=mongodb://127.0.0.1:27017/cropwise` or your MongoDB Atlas URI.

### 4. Running the Application
From the `cropwise` root directory, run both frontend and backend concurrently:
```powershell
npm run dev
```

Or run them individually:
```powershell
# Terminal 1 - Backend API (Port 5000)
npm run dev -w server

# Terminal 2 - Frontend Client (Port 5173)
npm run dev -w client
```

- **Frontend Application:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

---

## Testing Guide

### Automated Backend Test Suite
We provide an automated integration test script covering all required APIs:
```powershell
node server/test_api.mjs
```
The test suite verifies:
1. Health check endpoint.
2. Unregistered phone login returns 404 with registration link.
3. First-time registration with village returns JWT and creates profile.
4. Duplicate mobile number prevention.
5. Returning user login with mobile number only (no OTP).
6. Authenticated `GET /api/auth/me`.
7. Profile update `PUT /api/farmers/profile`.
8. Profile photo upload `POST /api/farmers/profile/photo` and static serving.
9. Notification seeding and retrieval.
10. Notification read status updates and clear all.
11. Activity history recording and retrieval.
12. Saved crop plans creation.
13. Cross-farmer data isolation (Farmer 2 cannot view Farmer 1's plans/activities).
14. Persistence across logout and re-login.

### Manual Testing Walkthrough

1. **First-Time Farmer Registration:**
   - Open http://localhost:5173/login.
   - Enter a new 10-digit phone number (e.g., `9876543210`).
   - Click "Sign In" -> Notice clear message: "This mobile number is not registered yet" with a button to "Register as a New Farmer".
   - Click "Register as a New Farmer" -> Fill in name, district, taluk, village.
   - Click "Create Account" -> You are redirected to your farm dashboard.

2. **Farmer Profile Button & Photo Upload:**
   - Click the profile card at the top-left corner of the sidebar or the top-right avatar in the header.
   - The profile dropdown opens displaying name, phone, village, and profile completion bar.
   - Click "Farm Profile & Settings" (`/app/profile`).
   - Click "Upload new photo" and select any picture (`.png` / `.jpg`). The photo is uploaded to `server/uploads/profiles/` and instantly appears in the topbar, sidebar, and profile page.
   - Update soil types, farm size, or water availability and click "Save farm profile".

3. **Notification Bell Dropdown:**
   - Click the bell icon at the top-right corner.
   - The notification panel opens showing sowing advisory for Karnataka's current season, calendar tasks, pest protection reminders, and weather updates (when rainfall is expected).
   - Click a notification to mark it as read (unread dot disappears).
   - Click "Mark all read" or "Clear all".

4. **Farming Activity History:**
   - In the sidebar, click "Farming history" (`/app/history`).
   - Review the recorded milestones (profile updates, photo uploads, sign-in, crop plans).
   - Go to "Crop planner" (`/app/recommendations`), save a plan.
   - Return to "Farming history" and see the newly logged plan activity with an "Open Plan" button.

5. **Logout and Persistence:**
   - Open the profile dropdown and click "Sign Out".
   - Re-enter the registered mobile number on the login page and click "Sign In".
   - Verify that your profile photo, farm details, saved plans, and activity history are fully restored.
