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
import { Avatar, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { COMPANY_API_ENDPOINT } from "@/utils/data";
import { setCompanies } from "@/redux/companyslice";

const CompaniesTable = () => {
  const { companies, searchCompanyByText } = useSelector(
    (store) => store.company
  );
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [filterCompany, setFilterCompany] = useState(companies);
  const [deleting, setDeleting] = useState(null); // id being deleted

  // Ask first. If the company has jobs, the server says how many and we ask
  // again before deleting those too. Jobs with applications can't be deleted.
  const deleteCompany = async (company) => {
    if (!window.confirm(`Delete ${company.name}? This can't be undone.`)) return;
    setDeleting(company._id);
    const url = `${COMPANY_API_ENDPOINT}/${company._id}`;
    try {
      let res;
      try {
        res = await axios.delete(url, { withCredentials: true });
      } catch (error) {
        const data = error.response?.data;
        if (error.response?.status !== 409 || !data?.needsConfirm) throw error;
        if (!window.confirm(`${data.message}

Delete ${company.name} and its jobs?`)) return;
        res = await axios.delete(url, { params: { withJobs: 1 }, withCredentials: true });
      }
      toast.success(res.data.message);
      dispatch(setCompanies(companies.filter((c) => c._id !== company._id)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete company");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    const filteredCompany =
      companies.length >= 0 &&
      companies.filter((company) => {
        if (!searchCompanyByText) {
          return true;
        }
        return company.name
          ?.toLowerCase()
          .includes(searchCompanyByText.toLowerCase());
      });
    setFilterCompany(filteredCompany);
  }, [companies, searchCompanyByText]);

  if (!companies) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Table>
        <TableCaption>Your recent registered Companies</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Logo</TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filterCompany.length === 0 ? (
            <span>No Companies Added</span>
          ) : (
            filterCompany?.map((company) => (
              <TableRow key={company._id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage
                      src={company.logo || "default-logo-url"}
                      alt={`${company.name} logo`}
                    />
                  </Avatar>
                </TableCell>
                <TableCell>{company.name}</TableCell>
                <TableCell>{company.createdAt.split("T")[0]}</TableCell>
                <TableCell className="text-right cursor-pointer">
                  <Popover>
                    <PopoverTrigger>
                      <MoreHorizontal />
                    </PopoverTrigger>
                    <PopoverContent className="w-32">
                      <div
                        onClick={() => navigate(`/admin/companies/${company._id}`)}
                        className="flex items-center gap-2 w-fit cursor-pointer"
                      >
                        <Edit2 className="w-4" />
                        <span>Edit</span>
                      </div>
                      <button
                        type="button"
                        disabled={deleting === company._id}
                        onClick={() => deleteCompany(company)}
                        className="flex items-center gap-2 w-fit mt-3 text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4" />
                        <span>{deleting === company._id ? "Deleting..." : "Delete"}</span>
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

export default CompaniesTable;
