import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api", timeout: 25000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cropwise-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errorMessage = (error) => error.response?.data?.error || (error.code === "ECONNABORTED" ? "The request timed out. Please try again." : "Could not connect to CropWise. Check that the backend is running.");
export default api;
