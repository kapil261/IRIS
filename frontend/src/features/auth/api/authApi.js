import apiClient from '../../../shared/api/apiClient'

export const authApi = {
  config: async () => (await apiClient.get('/auth/config')).data,
  login: async (email, password) => (await apiClient.post('/auth/login', { email, password })).data,
  signup: async (name, email, password) => (await apiClient.post('/auth/signup', { name, email, password })).data,
  google: async (credential) => (await apiClient.post('/auth/google', { credential })).data,
  me: async () => (await apiClient.get('/auth/me')).data
}

export default authApi
