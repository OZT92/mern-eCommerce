import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60 // 7 days
  );
};

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // prevents XSS (cross-site scripting) attacs
    secure: process.env.NODE_ENV === "production", // development surecinde false cunku onlineda zaten https
    sameSite: "strict", // prevents CSRF (cross-site request forgery) attack
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // prevents XSS (cross-site scripting) attacs
    secure: process.env.NODE_ENV === "production", // production surecinde true cunku onlineda zaten https
    sameSite: "strict", // prevents CSRF (cross-site request forgery) attack
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
};

// ! ------------------------------------------------------------
// ! ------------------------------------------------------------
export const signup = async (req, res) => {
  const { email, password, name } = req.body; // bunu kullanabilmek icin server.js'e app.use(express.json()); ekliyoruz. // allows you to parse the body of the request
  try {
    const userExists = await User.findOne({ email }); // kullanabilmek icin import User from '../models/user.model.js'

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = await User.create({ name, email, password }); // password bcrypt ile hashlenmmis sekilde DB'ye kaydedildi

    // authenticate
    const { accessToken, refreshToken } = generateTokens(user._id); // jwt ile token olusturuyor
    await storeRefreshToken(user._id, refreshToken); // redis db kaydediyor

    setCookies(res, accessToken, refreshToken); // cookie olarak tarayiciya kaydediyor

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body; // kullanicinin girdigi email ve passwordu aliyor
    const user = await User.findOne({ email }); // girilen email ile kayitli kullaniciyi db''den buluyor

    // bu email ile kayitli kullanici varsa ve password ayniysa
    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user._id); // accessToken ve refreshToken olusturuyor

      await storeRefreshToken(user._id, refreshToken); // olusturulan tokenleri redise kaydediyor
      setCookies(res, accessToken, refreshToken); // tarayici icin ayarliyor

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: "invalid email or password" });
    }
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      await redis.del(`refresh_token:${decoded.userId}`);
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//access tokeni yenileyecek adi daha once gecen refreshTokenla ayni olsada farklilar,
// daha once olusturdugumuz 7gun suresi olan mevcut refreshToken'i kullanarak 15dk'lik
// accsessToken'i yenileyecegiz
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken; // login olurken cookie olarak kaydedilen refresToken

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" }); // cookielerde refresh token yoksa
    }
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); // decoded degeri ogrenmek icin
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`); //rediste kayitli olan ile kiyaslamak icin

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" }); // redisteki refresh token ile ayni degilse
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    ); // yenilenmis accessToken olusturuyor

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    }); // cookie olarak kaydediyor

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.log("Error in refreshToken controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
