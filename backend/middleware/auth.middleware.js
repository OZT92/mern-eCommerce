import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken; // cookie olarak kaydedilmis accessToken olup olmadigina bakiyoruz
    if (!accessToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No access token provided" });
    }
    try {
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET); // auth.controller.js'te generateTokens fonksiyonunda 'const accessToken = jwt.sign({userId}, process.env.ACCESS_TOKEN_SECRET)...' ile kaydedilen tokeni dogrulamak icin
      const user = await User.findById(decoded.userId).select("-password"); // select("-password") ile password kismini almiyor

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user; //bu kullaniciyi requeste koymak icin

      next(); // siradaki fonksiyona gecirir
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Unauthorized - Access token expired" });
      }
      throw error;
    }
  } catch (error) {
    console.log("Error in protectRoute middleware", error.message);
    res.status(401).json({ message: "Unauthorized - Invalid access token" });
  }
};

export const adminRoute = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next(); // siradaki fonksiyona gecirir
  } else {
    res.status(403).json({ message: "Forbidden - Admin access required" });
  }
};
