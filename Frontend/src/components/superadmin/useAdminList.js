import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ADMIN_API_ENDPOINT } from "@/utils/data";

// Loads one page of an admin list (users / jobs / companies) with search.
//   const list = useAdminList("users", "users", { role });
//   list.items, list.page, list.totalPages, list.setPage, list.setSearch, list.reload()
const useAdminList = (path, key, filters = {}) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const filterKey = JSON.stringify(filters);

  // wait until typing pauses before searching, and start again from page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [filterKey]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API_ENDPOINT}/${path}`, {
        params: { search: debouncedSearch, page, ...JSON.parse(filterKey) },
        withCredentials: true,
      });
      setItems(res.data[key]);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load the list");
    } finally {
      setLoading(false);
    }
  }, [path, key, debouncedSearch, page, filterKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, page, totalPages, total, loading, search, setSearch, setPage, reload };
};

export default useAdminList;
