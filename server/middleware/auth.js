import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    req.farmerId = jwt.verify(token, process.env.JWT_SECRET || "cropwise-local-demo-secret").sub;
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}
