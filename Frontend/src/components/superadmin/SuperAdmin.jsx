import { useState } from "react";
import Navbar from "../components_lite/Navbar";
import Overview from "./Overview";
import UsersPanel from "./UsersPanel";
import JobsPanel from "./JobsPanel";
import CompaniesPanel from "./CompaniesPanel";

const TABS = [
  { key: "overview", label: "Overview", Panel: Overview },
  { key: "users", label: "Users", Panel: UsersPanel },
  { key: "jobs", label: "Jobs", Panel: JobsPanel },
  { key: "companies", label: "Companies", Panel: CompaniesPanel },
];

// Super admin dashboard at /super-admin (Admins only - see AdminRoute)
const SuperAdmin = () => {
  const [tab, setTab] = useState("overview");
  const { Panel } = TABS.find((t) => t.key === tab);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-gray-500 mb-6">Manage users, jobs and companies across the whole site.</p>

        <div className="flex gap-1 border-b mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 -mb-px border-b-2 font-medium whitespace-nowrap ${
                tab === t.key
                  ? "border-[#6B3AC2] text-[#6B3AC2]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Panel />
      </div>
    </div>
  );
};

export default SuperAdmin;
