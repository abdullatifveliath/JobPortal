import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import useAdminList from "./useAdminList";
import { runAdminAction, formatDate } from "./adminActions";
import { SearchBox, ListFooter } from "./ListControls";

const CompaniesPanel = () => {
  const list = useAdminList("companies", "companies");

  const remove = (c) => {
    const jobs = c.jobCount
      ? `\n\nIts ${c.jobCount} job(s) and all their applications will be deleted too.`
      : "";
    if (!window.confirm(`Permanently delete ${c.name}?${jobs}`)) return;
    runAdminAction("delete", `companies/${c._id}`, null, list.reload);
  };

  return (
    <div>
      <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search company name" />

      <div className="overflow-x-auto border rounded-xl bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((c) => (
              <TableRow key={c._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {c.logo && <img src={c.logo} alt="" className="w-7 h-7 rounded object-contain" />}
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.location && <div className="text-xs text-gray-500">{c.location}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="break-all">
                  {c.userId ? c.userId.fullname : "Deleted user"}
                  {c.userId && <div className="text-xs text-gray-500">{c.userId.email}</div>}
                </TableCell>
                <TableCell>{c.jobCount}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(c.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" onClick={() => remove(c)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!list.loading && list.items.length === 0 && (
          <p className="text-center text-gray-500 py-6">No companies found</p>
        )}
      </div>
      <ListFooter list={list} noun="company" />
    </div>
  );
};

export default CompaniesPanel;
