import axios from "axios";

// The server address comes from REACT_APP_API_URL (set per site on Vercel).
// Without it, the site keeps talking to the current live server.
const baseURL =
  process.env.REACT_APP_API_URL ||
  "https://diet-in-a-minute-service-production.up.railway.app";
const API = axios.create({
  baseURL: baseURL + '/api',
});




API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login"; // ⛔ redirect immediately
    }
    return Promise.reject(error);
  }
);

export { baseURL };
export default API;

// Lists that rarely change (foods, workouts) are kept for a few minutes so screens open instantly.
const cache = new Map();
export function cachedGet(url, ttlMs = 5 * 60 * 1000) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = API.get(url).catch((err) => { cache.delete(url); throw err; });
  cache.set(url, { at: Date.now(), promise });
  return promise;
}
export function clearCached(prefix = "") {
  [...cache.keys()].forEach((k) => { if (k.startsWith(prefix)) cache.delete(k); });
}
