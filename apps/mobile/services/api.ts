import axios from "axios";
import { config } from "@/constants/config";

export const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 10000,
});
