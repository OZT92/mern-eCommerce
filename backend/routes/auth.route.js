import express from "express";
import {
  signup,
  login,
  logout,
  refreshToken,
  getProfile, // auth.controller.js te olusturacagimiz fonksiyonu import ediyoruz
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken); // burada kullaniyoruz
router.get("/profile", protectRoute, getProfile);

export default router;
