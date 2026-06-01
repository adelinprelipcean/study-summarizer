import axios from "axios";

// Dynamically read from the Vite environment variables, falling back to localhost
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

export default api;
