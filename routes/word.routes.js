import express from "express";
import {
  getWords,
  updateWord,
  deleteWord,
} from "../controllers/word.controller.js";
//import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

//TODO: add verifyToken, isAdmin,
// Protected: Only ADMIN can hit these endpoints
router.get("/", getWords); // verifyToken, isAdmin, getWords);
router.put("/:id", updateWord); //verifyToken, isAdmin,
router.delete("/:id", deleteWord); //verifyToken, isAdmin, deleteWord);

export default router;
