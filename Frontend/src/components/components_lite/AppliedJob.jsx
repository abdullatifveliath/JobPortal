import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { APPLICATION_API_ENDPOINT } from "@/utils/data";
import { setAllAppliedJobs } from "@/redux/jobSlice";

const AppliedJob = () => {
  const { allAppliedJobs } = useSelector((store) => store.job);
  const dispatch = useDispatch();
  const [withdrawing, setWithdrawing] = useState(null); // id being withdrawn

  // only pending applications can be withdrawn (the server checks this too)
  const withdraw = async (application) => {
    const title = application.job?.title || "this job";
    if (!window.confirm(`Withdraw your application for "${title}"? You can apply again later.`)) return;
    setWithdrawing(application._id);
    try {
      const res = await axios.delete(`${APPLICATION_API_ENDPOINT}/${application._id}`, {
        withCredentials: true,
      });
      toast.success(res.data.message);
      dispatch(setAllAppliedJobs(allAppliedJobs.filter((a) => a._id !== application._id)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not withdraw application");
    } finally {
      setWithdrawing(null);
    }
  };
  return (
    <div>
      <Table>
        <TableCaption>Recent Applied Jobs</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allAppliedJobs.length <= 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center font-medium text-gray-500 py-6">
                You have not applied to any jobs yet.
              </TableCell>
            </TableRow>
          ) : (
            allAppliedJobs.map((appliedJob) => (
              <TableRow key={appliedJob._id}>
                <TableCell>{appliedJob?.createdAt.split("T")[0]}</TableCell>
                <TableCell>{appliedJob.job?.title || "Removed job"}</TableCell>
                <TableCell>{appliedJob.job?.company?.name}</TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      appliedJob?.status === "rejected"
                        ? "bg-red-500"
                        : appliedJob?.status === "accepted"
                        ? "bg-green-600"
                        : "bg-gray-500"
                    }`}
                  >
                    {" "}
                    {appliedJob?.status}
                  </Badge>{" "}
                </TableCell>
                <TableCell className="text-right">
                  {appliedJob.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={withdrawing === appliedJob._id}
                      onClick={() => withdraw(appliedJob)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      {withdrawing === appliedJob._id ? "Withdrawing..." : "Withdraw"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AppliedJob;
