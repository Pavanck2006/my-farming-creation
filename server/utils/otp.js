export const otpChallenges = new Map();
export const demoFarmers = new Map();
export const demoPlans = new Map();
export const demoChats = new Map();
export const demoNotifications = new Map();
export const demoActivities = new Map();

export function validPhone(phone) {
  const cleaned = String(phone || "").replace(/[\s\-()]/g, "");
  return /^(\+?\d{10,15}|\d{10})$/.test(cleaned);
}

export function phoneKey(phone) {
  let cleaned = String(phone || "").replace(/[\s\-()]/g, "");
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = "+91" + cleaned;
  }
  return cleaned;
}
