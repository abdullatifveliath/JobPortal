import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Confirms the request comes from a logged-in user and sets req.id.
// Also checks the database, so a deleted or blocked account is locked out
// straight away instead of when its login cookie expires.
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res
      .status(401)
      .json({ message: "No token provided", success: false });
  }
  let decoded;
  try {
    // jwt.verify throws on an invalid or expired token
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Invalid token", success: false });
  }
  try {
    const user = await User.findById(decoded.userId).select("isBlocked");
    if (!user) {
      return res.status(401).json({ message: "User not found", success: false });
    }
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
        success: false,
      });
    }
    req.id = decoded.userId;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

export default authenticateToken;
