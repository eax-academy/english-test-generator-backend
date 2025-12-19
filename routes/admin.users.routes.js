import express from "express";
import {
  getAllUsers,
  deleteUserById,
  updateUserById,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", getAllUsers);
router.delete("/:id", deleteUserById);
router.put("/:id", updateUserById);

export default router;
