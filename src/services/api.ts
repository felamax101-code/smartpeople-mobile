import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { API } from "@/constants/api"
import { attachAuthInterceptors } from "./tokenRefreshService"
const api = axios.create({
  baseURL: API.DJANGO_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Client-Type":"mobile",
  },
})
//  track refresh state 

attachAuthInterceptors(api)
console.log(api)
export default api