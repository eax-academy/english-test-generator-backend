import express from "express";
import * as authContoller from "../controllers/auth.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

import { registrationLimiter, authLimiter, forgotPasswordLimiter } from '../middleware/ratelimiter.middleware.js';

const router = express.Router();

router.post("/register", registrationLimiter, authContoller.register);
router.post("/login", authLimiter, authContoller.login); // Restored Limiter for users
router.post("/admin/login", authContoller.adminLogin); // No Limiter for admins
router.get("/refresh", authContoller.refresh);
router.post("/change-password", verifyToken, forgotPasswordLimiter, authContoller.changePassword);

router.post("/logout", verifyToken, authContoller.logout);
router.get("/me", verifyToken, (req, res) => {
  res.json({
    id: req.user.sub,
    role: req.user.role,
  });
});

export default router;
