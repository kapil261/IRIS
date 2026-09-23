import apiClient from '../../../shared/api/apiClient'

// Conversation threads (the "chats" sidebar list).
export const threadsApi = {
  list: async () => (await apiClient.get('/chats')).data,
  get: async (chatId) => (await apiClient.get(`/chat/${chatId}`)).data,
  remove: async (chatId) => (await apiClient.delete(`/chat/${chatId}`)).data,
  rename: async (chatId, title) => (await apiClient.put(`/chat/${chatId}`, { title })).data,
  updateSettings: async (chatId, settings) => (await apiClient.put(`/chat/${chatId}`, settings)).data
}

export default threadsApi
