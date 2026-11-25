import { useState } from "react";
import { useSelector } from "react-redux";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import useAdminList from "./useAdminList";
import { runAdminAction, formatDate } from "./adminActions";
import { SearchBox, ListFooter } from "./ListControls";
import { roleLabel } from "@/utils/roles";

const ROLE_FILTERS = ["All", "JobSeeker", "Recruiter", "Admin", "Blocked"];

const UsersPanel = () => {
  const [role, setRole] = useState("All");
  const list = useAdminList("users", "users", role === "All" ? {} : { role });
  const me = useSelector((store) => store.auth.user);

  const toggleBlock = (u) => {
    const verb = u.isBlocked ? "Unblock" : "Block";
    const note = u.isBlocked ? "" : "\n\nThey will be logged out and can't log in until unblocked.";
    if (!window.confirm(`${verb} ${u.fullname} (${u.email})?${note}`)) return;
    runAdminAction("patch", `users/${u._id}/block`, { blocked: !u.isBlocked }, list.reload);
  };

  const remove = (u) => {
    const what =
      u.role === "Recruiter"
        ? "their companies, all their jobs and every application to those jobs"
        : "their applications and resume";
    if (!window.confirm(`Permanently delete ${u.fullname} (${u.email})?\n\nThis also deletes ${what}. It can't be undone.`)) return;
    runAdminAction("delete", `users/${u._id}`, null, list.reload);
  };

  return (
    <div>
      <SearchBox value={list.search} onChange={list.setSearch} placeholder="Search name or email">
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((r) => (
            <Button key={r} size="sm" variant={role === r ? "default" : "outline"} onClick={() => setRole(r)}>
              {roleLabel(r)}
            </Button>
          ))}
        </div>
      </SearchBox>

      <div className="overflow-x-auto border rounded-xl bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((u) => {
              const manageable = u.role !== "Admin" && u._id !== me?._id;
              return (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">{u.fullname}</TableCell>
                  <TableCell className="break-all">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{roleLabel(u.role)}</Badge>
                      {!u.isVerified && <Badge variant="secondary">Unverified</Badge>}
                      {u.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {manageable ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleBlock(u)}>
                          {u.isBlocked ? "Unblock" : "Block"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(u)}>
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{u._id === me?._id ? "You" : "Admin"}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!list.loading && list.items.length === 0 && (
          <p className="text-center text-gray-500 py-6">No users found</p>
        )}
      </div>
      <ListFooter list={list} noun="user" />
    </div>
  );
};

export default UsersPanel;
