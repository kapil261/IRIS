import axios from 'axios'
import tokenStorage from '../utils/tokenStorage'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const apiClient = axios.create({ baseURL: API_BASE_URL })

// The store registers a handler here (see app/store.js) so an expired/invalid token logs the
// user out everywhere, without this module having to import the store (which would be circular).
let onUnauthorized = null
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/signup')
    if (error.response?.status === 401 && !isAuthRoute && onUnauthorized) {
      onUnauthorized()
    }
    return Promise.reject(error)
  }
)

export const SERVER_UNREACHABLE_MESSAGE =
  `Can't reach the IRIS server at ${API_BASE_URL}. Make sure the backend is running (npm run dev in Backend/).`

/** Turn an axios/fetch error into a user-facing message. */
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (error?.response?.data?.message) return error.response.data.message
  // axios: request sent but no response at all → server down / wrong URL / CORS
  if (error?.request && !error?.response) return SERVER_UNREACHABLE_MESSAGE
  return fallback
}

export default apiClient
