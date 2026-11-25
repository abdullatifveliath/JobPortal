import { useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { USER_API_ENDPOINT } from "@/utils/data";
import { setSavedJobs } from "@/redux/jobSlice";

// loads the user's saved jobs from the server into Redux
export const fetchSavedJobs = async (dispatch) => {
  const res = await axios.get(`${USER_API_ENDPOINT}/saved-jobs`, { withCredentials: true });
  if (res.data.success) dispatch(setSavedJobs(res.data.savedJobs));
};

// which user's saved jobs are already loaded - so the Navbar (on every page)
// only fetches once per login, not on every page change
let loadedForUser = null;

// Used by the Navbar: loads saved jobs after login / page reload.
const useLoadSavedJobs = () => {
  const dispatch = useDispatch();
  const userId = useSelector((store) => store.auth.user?._id);

  useEffect(() => {
    if (!userId) {
      loadedForUser = null;
      return;
    }
    if (loadedForUser === userId) return;
    loadedForUser = userId;
    fetchSavedJobs(dispatch).catch(() => {
      loadedForUser = null; // e.g. the login expired - try again next time
    });
  }, [userId, dispatch]);
};

export default useLoadSavedJobs;
