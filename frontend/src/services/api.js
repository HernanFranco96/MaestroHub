import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.131.141:3000/api",
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
