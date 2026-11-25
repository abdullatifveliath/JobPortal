import { useEffect, useState } from "react";
import { roleLabel } from "@/utils/roles";
import axios from "axios";
import { toast } from "sonner";
import { ADMIN_API_ENDPOINT } from "@/utils/data";
import { Badge } from "../ui/badge";
import { formatDate } from "./adminActions";

const StatCard = ({ label, value, detail }) => (
  <div className="border rounded-xl p-4 bg-white shadow-sm">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-3xl font-bold text-[#6B3AC2] my-1">{value}</div>
    {detail && <div className="text-xs text-gray-500">{detail}</div>}
  </div>
);

// site-wide totals and the newest sign-ups
const Overview = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios
      .get(`${ADMIN_API_ENDPOINT}/stats`, { withCredentials: true })
      .then((res) => setStats(res.data.stats))
      .catch((error) => toast.error(error.response?.data?.message || "Could not load stats"));
  }, []);

  if (!stats) return <p className="text-gray-500">Loading…</p>;
  const { users, applications } = stats;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Users"
          value={users.total}
          detail={`${users.jobSeekers} job seekers · ${users.recruiters} recruiters · ${users.admins} admins`}
        />
        <StatCard label="Blocked users" value={users.blocked} />
        <StatCard label="Jobs" value={stats.jobs} detail={`${stats.companies} companies`} />
        <StatCard
          label="Applications"
          value={applications.total}
          detail={`${applications.pending} pending · ${applications.accepted} accepted · ${applications.rejected} rejected`}
        />
      </div>

      <h2 className="font-bold text-lg mt-8 mb-3">Newest sign-ups</h2>
      <div className="border rounded-xl bg-white divide-y">
        {stats.recentUsers.map((u) => (
          <div key={u._id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{u.fullname}</div>
              <div className="text-gray-500 break-all">{u.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{roleLabel(u.role)}</Badge>
              {!u.isVerified && <Badge variant="secondary">Unverified</Badge>}
              {u.isBlocked && <Badge variant="destructive">Blocked</Badge>}
              <span className="text-gray-500">{formatDate(u.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Overview;
