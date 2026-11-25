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
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import axios from "axios";
import { APPLICATION_API_ENDPOINT, USER_API_ENDPOINT } from "@/utils/data";
import { setAllApplicants } from "@/redux/applicationSlice";

// same colours as the Applications page
const STATUS_STYLE = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

const ApplicantsTable = () => {
  const { applicants } = useSelector((store) => store.application);
  const dispatch = useDispatch();
  const [updating, setUpdating] = useState(null); // id of the row being changed

  const statusHandler = async (status, id) => {
    setUpdating(id);
    try {
      const res = await axios.post(
        `${APPLICATION_API_ENDPOINT}/status/${id}/update`,
        { status },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        // show the new status straight away
        dispatch(
          setAllApplicants({
            ...applicants,
            applications: applicants.applications.map((a) =>
              a._id === id ? { ...a, status } : a
            ),
          })
        );
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <Table>
        <TableCaption>A list of your recent applied user</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>FullName</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Resume</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applicants?.applications?.map((item) => (
            <TableRow key={item._id}>
              <TableCell>{item?.applicant?.fullname || "Deleted user"}</TableCell>
              <TableCell>{item?.applicant?.email}</TableCell>
              <TableCell>{item?.applicant?.phoneNumber}</TableCell>
              <TableCell>
                {item.applicant?.profile?.resume ? (
                  <a
                    className="text-blue-600 hover:underline cursor-pointer"
                    // opened through the backend, which checks this recruiter may see it
                    href={`${USER_API_ENDPOINT}/${item.applicant._id}/resume`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.applicant.profile.resumeOriginalName || "View Resume"}
                  </a>
                ) : (
                  <span>NA</span>
                )}
              </TableCell>
              {/* when they applied (not when they made their account) */}
              <TableCell className="whitespace-nowrap">{formatDate(item.createdAt)}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[item.status] || ""}`}>
                  {item.status}
                </span>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {updating === item._id ? (
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                  <div className="flex gap-2 justify-end">
                    {item.status !== "accepted" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => statusHandler("accepted", item._id)}>
                        Accept
                      </Button>
                    )}
                    {item.status !== "rejected" && (
                      <Button size="sm" variant="destructive" onClick={() => statusHandler("rejected", item._id)}>
                        Reject
                      </Button>
                    )}
                    {item.status !== "pending" && (
                      <Button size="sm" variant="outline" onClick={() => statusHandler("pending", item._id)}>
                        Undo
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApplicantsTable;
