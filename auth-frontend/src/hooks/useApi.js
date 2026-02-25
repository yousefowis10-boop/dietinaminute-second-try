import axios from "axios";

// const baseURL = "http://localhost:8000";
const baseURL = "https://diet-in-a-minute-service-production.up.railway.app";
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