// API base URL.
// - Set VITE_API_URL (e.g. in Frontend/.env) to point at a separate backend.
// - Otherwise: in development, talk to the local backend; in production the
//   backend serves this app itself, so a same-origin "/api" path just works.
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5011/api" : "/api");

export const USER_API_ENDPOINT = `${API_BASE}/user`;
export const JOB_API_ENDPOINT = `${API_BASE}/job`;
export const APPLICATION_API_ENDPOINT = `${API_BASE}/application`;
export const COMPANY_API_ENDPOINT = `${API_BASE}/company`;
export const CHAT_API_ENDPOINT = `${API_BASE}/chat`;
export const ADMIN_API_ENDPOINT = `${API_BASE}/admin`;
