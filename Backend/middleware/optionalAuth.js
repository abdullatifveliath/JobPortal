import jwt from "jsonwebtoken";

// Like authenticateToken, but never blocks: sets req.id only if a valid
// login cookie is sent. For routes that work for visitors too.
const optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (token) req.id = jwt.verify(token, process.env.JWT_SECRET).userId;
  } catch {
    // invalid / expired cookie - treat as a visitor
  }
  next();
};

export default optionalAuth;
