import { Outlet } from "react-router-dom";
import Footer from "./Footer";

// Wraps the public pages (see App.jsx) so they all share one footer.
// The column layout keeps the footer at the bottom even on short pages.
const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default PublicLayout;
