import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export const getDevices = async () => {
  const response = await api.get("/devices");
  return response.data;
};

export const getMetrics = async () => {
  const response = await api.get("/metrics");
  return response.data;
};

export const getEvents = async () => {
  const response = await api.get("/events");
  return response.data;
};

export default api;
