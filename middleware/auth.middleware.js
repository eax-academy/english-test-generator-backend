import jwt from "jsonwebtoken";
import JwtClaims from "../utils/JwtClaims.js";

export const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // Validate the payload using your JwtClaims class
    // This ensures 'sub' is a valid ID and 'role' is a valid role.
    const claims = JwtClaims.fromPayload(verified);
    req.user = claims;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied: Admins Only" });
  }
};
