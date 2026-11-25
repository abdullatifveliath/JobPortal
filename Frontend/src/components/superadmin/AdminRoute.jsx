import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// Only lets Admins see the page. The backend checks the role on every
// request too - this just keeps other users from seeing an empty dashboard.
const AdminRoute = ({ children }) => {
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin, navigate]);

  return isAdmin ? children : null;
};

export default AdminRoute;
