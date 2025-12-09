import express from "express";
import * as authContoller from "../controllers/auth.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authContoller.register);
router.post("/login", authContoller.login);
router.post("/refresh", authContoller.refresh);
router.post("/forgot-password", authContoller.forgotPassword);
router.post("/reset-password", authContoller.resetPassword);

router.post("/logout", verifyToken, authContoller.logout);
router.get("/me", verifyToken, (req, res) => {
  res.json({
    id: req.user.sub,
    role: req.user.role,
  });
});

export default router;
