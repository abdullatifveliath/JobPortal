import axios from "axios";
import { toast } from "sonner";
import { ADMIN_API_ENDPOINT } from "@/utils/data";

// Runs an admin change (block / delete), shows the result, then refreshes the list.
// Returns true if it worked.
export const runAdminAction = async (method, path, body, onDone) => {
  try {
    const res = await axios({
      method,
      url: `${ADMIN_API_ENDPOINT}/${path}`,
      data: body,
      withCredentials: true,
    });
    toast.success(res.data.message);
    onDone?.();
    return true;
  } catch (error) {
    toast.error(error.response?.data?.message || "Something went wrong");
    return false;
  }
};

export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
