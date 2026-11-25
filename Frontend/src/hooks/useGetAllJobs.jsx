import { setAllJobs } from "@/redux/jobSlice";
import { JOB_API_ENDPOINT } from "@/utils/data";
import axios from "axios";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

// Pass a keyword to override the global search query
// (e.g. "" on the Jobs page to always load every job).
const useGetAllJobs = (keywordOverride) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { searchedQuery } = useSelector((store) => store.job);

  const rawKeyword =
    keywordOverride !== undefined ? keywordOverride : searchedQuery;
  const keyword =
    typeof rawKeyword === "string" ? rawKeyword.trim() : "";

  useEffect(() => {
    const fetchAllJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${JOB_API_ENDPOINT}/get?keyword=${encodeURIComponent(keyword)}`,
          {
            withCredentials: true,
          }
        );
        if (res.data.success) {
          // Updated success check
          dispatch(setAllJobs(res.data.jobs));
        } else {
          setError("Failed to fetch jobs.");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        setError(error.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllJobs();
  }, [dispatch, keyword]);

  return { loading, error };
};

export default useGetAllJobs;
