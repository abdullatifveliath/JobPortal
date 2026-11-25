import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Navbar from "../components_lite/Navbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { APPLICATION_API_ENDPOINT, USER_API_ENDPOINT } from "@/utils/data";

const TABS = [
  { key: "", label: "All", count: "all" },
  { key: "pending", label: "Pending", count: "pending" },
  { key: "accepted", label: "Accepted", count: "accepted" },
  { key: "rejected", label: "Rejected", count: "rejected" },
];

const STATUS_STYLE = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

// /admin/applications - every application to every job this recruiter posted
const AllApplications = () => {
  const [status, setStatus] = useState("");
  const [job, setJob] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // id of the row being changed

  const latestRequest = useRef(0);

  // wait for the user to stop typing before searching (new filters start at page 1)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const pickStatus = (value) => {
    setStatus(value);
    setPage(1);
  };
  const pickJob = (value) => {
    setJob(value);
    setPage(1);
  };

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const res = await axios.get(`${APPLICATION_API_ENDPOINT}/recruiter`, {
        params: { status, job, search: debounced, page },
        withCredentials: true,
      });
      // ignore a slow older reply that arrives after a newer one
      if (requestId === latestRequest.current) setData(res.data);
    } catch (error) {
      if (requestId === latestRequest.current) {
        toast.error(error.response?.data?.message || "Could not load applications");
      }
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [status, job, debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (app, newStatus) => {
    setUpdating(app._id);
    try {
      const res = await axios.post(
        `${APPLICATION_API_ENDPOINT}/status/${app._id}/update`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success(res.data.message);
      await load(); // refresh counts, and drop the row if it no longer fits the tab
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update status");
    } finally {
      setUpdating(null);
    }
  };

  const applications = data?.applications || [];
  const counts = data?.counts || {};

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto my-8 px-4">
        <h1 className="text-2xl font-bold mb-1">Applications</h1>
        <p className="text-gray-500 mb-6">Everyone who applied to any of your jobs, newest first.</p>

        {/* status tabs */}
        <div className="flex gap-1 border-b mb-4 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => pickStatus(t.key)}
              className={`px-4 py-2 -mb-px border-b-2 font-medium whitespace-nowrap ${
                status === t.key
                  ? "border-[#6B3AC2] text-[#6B3AC2]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label} <span className="text-xs text-gray-400">({counts[t.count] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicant name or email"
            className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-72"
          />
          <select
            value={job}
            onChange={(e) => pickJob(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-72 bg-white"
          >
            <option value="">All jobs</option>
            {(data?.jobs || []).map((j) => (
              <option key={j._id} value={j._id}>
                {j.title}
                {j.company ? ` (${j.company})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border rounded-xl bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Resume</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => {
                const person = app.applicant;
                const busy = updating === app._id;
                return (
                  <TableRow key={app._id}>
                    <TableCell>
                      <div className="font-medium">{person?.fullname || "Deleted user"}</div>
                      {person && (
                        <div className="text-xs text-gray-500 break-all">
                          {person.email}
                          {person.phoneNumber ? ` · ${person.phoneNumber}` : ""}
                        </div>
                      )}
                      {person?.profile?.skills?.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {person.profile.skills.slice(0, 4).join(", ")}
                          {person.profile.skills.length > 4 ? "…" : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.job ? (
                        <Link to={`/admin/jobs/${app.job._id}/applicants`} className="hover:underline">
                          {app.job.title}
                        </Link>
                      ) : (
                        "Removed job"
                      )}
                      {app.job?.company?.name && (
                        <div className="text-xs text-gray-500">{app.job.company.name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {person?.profile?.resume ? (
                        <a
                          href={`${USER_API_ENDPOINT}/${person._id}/resume`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {person.profile.resumeOriginalName || "View resume"}
                        </a>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(app.createdAt)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[app.status]}`}>
                        {app.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        <div className="flex gap-2 justify-end">
                          {app.status !== "accepted" && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => changeStatus(app, "accepted")}>
                              Accept
                            </Button>
                          )}
                          {app.status !== "rejected" && (
                            <Button size="sm" variant="destructive" onClick={() => changeStatus(app, "rejected")}>
                              Reject
                            </Button>
                          )}
                          {app.status !== "pending" && (
                            <Button size="sm" variant="outline" onClick={() => changeStatus(app, "pending")}>
                              Undo
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!loading && applications.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              {data?.jobs?.length === 0 ? "Post a job to start receiving applications." : "No applications found"}
            </p>
          )}
          {loading && applications.length === 0 && (
            <p className="text-center text-gray-500 py-8">Loading applications…</p>
          )}
        </div>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-gray-500">
              Page {data.page} of {data.pages} · {data.total} applications
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= data.pages || loading} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllApplications;
