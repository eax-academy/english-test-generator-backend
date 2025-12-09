import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const verifyToken = (req, res, next) => {
  // 1. Look for token in Cookies (Primary) OR Headers (Backup for mobile/Postman)
  const token =
    req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // 2. Verify Token
    // We use jwt directly here because we need the payload immediately
    const decoded = jwt.verify(token, config.accessSecret);

    // 3. Attach User Info to Request
    // decoded looks like: { sub: 'userId', role: 'user', iat: 123, exp: 456 }
    req.user = decoded;

    next();
  } catch (error) {
    // Token is expired or invalid
    return res.status(403).json({ error: "Invalid or expired access token" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied: Admins Only" });
  }
};
//TODO: DECIDE TEACHER FUNCTIONALITY
// Optional: Role-based authorization --TEACHER?
// export const requireRole = (role) => {
//   return (req, res, next) => {
//     if (req.user && req.user.role === role) {
//       next();
//     } else {
//       res.status(403).json({ error: "Insufficient permissions" });
//     }
//   };
// };
