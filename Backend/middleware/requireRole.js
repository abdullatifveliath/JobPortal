import { User } from "../models/user.model.js";
import { ROLE_LABELS } from "../utils/roles.js";

// Use after authenticateToken. Looks up the user's role in the database
// (not from the token, so a role change takes effect immediately).
//   router.post("/post", authenticateToken, requireRole("Recruiter"), postJob)
const requireRole = (role) => async (req, res, next) => {
  try {
    const user = await User.findById(req.id).select("role");
    if (!user) {
      return res.status(401).json({ message: "User not found", success: false });
    }
    if (user.role !== role) {
      return res.status(403).json({
        message: `Only ${(ROLE_LABELS[role] || role).toLowerCase()}s can do this`,
        success: false,
      });
    }
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

export default requireRole;
