import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import useAdminList from "./useAdminList";
import { runAdminAction, formatDate } from "./adminActions";
import { SearchBox, ListFooter } from "./ListControls";

const JobsPanel = () => {
  const list = useAdminList("jobs", "jobs");

  const remove = (job) => {
    const apps = job.applicationCount
      ? `\n\nIts ${job.applicationCount} application(s) will be deleted too.`
      : "";
    if (!window.confirm(`Permanently delete "${job.title}" at ${job.company?.name || "unknown company"}?${apps}`)) return;
    runAdminAction("delete", `jobs/${job._id}`, null, list.reload);
  };

  return (
    <div>
      <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search job title or company" />

      <div className="overflow-x-auto border rounded-xl bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Posted by</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((job) => (
              <TableRow key={job._id}>
                <TableCell>
                  <Link to={`/description/${job._id}`} className="font-medium hover:underline">
                    {job.title}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {job.location} · {job.jobType} · {job.salary} LPA
                  </div>
                </TableCell>
                <TableCell>{job.company?.name || "—"}</TableCell>
                <TableCell className="break-all">
                  {job.created_by ? job.created_by.fullname : "Deleted user"}
                  {job.created_by && <div className="text-xs text-gray-500">{job.created_by.email}</div>}
                </TableCell>
                <TableCell>{job.applicationCount}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(job.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" onClick={() => remove(job)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!list.loading && list.items.length === 0 && (
          <p className="text-center text-gray-500 py-6">No jobs found</p>
        )}
      </div>
      <ListFooter list={list} noun="job" />
    </div>
  );
};

export default JobsPanel;
