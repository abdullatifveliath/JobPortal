import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Edit2, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { JOB_API_ENDPOINT } from "@/utils/data";
import { setAllAdminJobs } from "@/redux/jobSlice";

const AdminJobsTable = () => {
  const { companies, searchCompanyByText } = useSelector(
    (store) => store.company
  );
  const { allAdminJobs, searchJobByText } = useSelector((store) => store.job);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [filterJobs, setFilterJobs] = useState(allAdminJobs);
  const [deleting, setDeleting] = useState(null); // id being deleted

  // jobs with applications are refused by the server, which explains why
  const deleteJob = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This can't be undone.`)) return;
    setDeleting(job._id);
    try {
      const res = await axios.delete(`${JOB_API_ENDPOINT}/${job._id}`, { withCredentials: true });
      toast.success(res.data.message);
      dispatch(setAllAdminJobs(allAdminJobs.filter((j) => j._id !== job._id)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete job");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    const filteredJobs =
      allAdminJobs.length >= 0 &&
      allAdminJobs.filter((job) => {
        if (!searchJobByText) {
          return true;
        }
        return (
          job.title?.toLowerCase().includes(searchJobByText.toLowerCase()) ||
          job?.company?.name
            .toLowerCase()
            .includes(searchJobByText.toLowerCase())
        );
      });
    setFilterJobs(filteredJobs);
  }, [allAdminJobs, searchJobByText]);

  if (!companies) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Table>
        <TableCaption>Your recent Posted Jobs</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filterJobs.length === 0 ? (
            <span>No Job Added</span>
          ) : (
            filterJobs?.map((job) => (
              <TableRow key={job._id}>
                <TableCell>{job?.company?.name}</TableCell>
                <TableCell>{job.title}</TableCell>
                <TableCell>{job.createdAt.split("T")[0]}</TableCell>
                <TableCell className="text-right cursor-pointer">
                  <Popover>
                    <PopoverTrigger>
                      <MoreHorizontal />
                    </PopoverTrigger>
                    <PopoverContent className="w-32">
                      <div
                        onClick={() => navigate(`/admin/companies/${job._id}`)}
                        className="flex items-center gap-2 w-fit cursor-pointer mb-1"
                      >
                        <Edit2 className="w-4" />
                        <span>Edit</span>
                      </div>
                      <hr />
                      <div onClick={() => navigate(`/admin/jobs/${job._id}/applicants`)} className="flex items-center gap-2 w-fit cursor-pointer mt-1">
                        <Eye className="w-4"></Eye>
                        <span>Applicants</span>
                      </div>
                      <hr />
                      <button
                        type="button"
                        disabled={deleting === job._id}
                        onClick={() => deleteJob(job)}
                        className="flex items-center gap-2 w-fit mt-3 text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4" />
                        <span>{deleting === job._id ? "Deleting..." : "Delete"}</span>
                      </button>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminJobsTable;
