import apiClient from '../../../shared/api/apiClient'

export const mentorApi = {
  /** Roadmap + progress for a thread, or null if the mentor hasn't planned a project there yet. */
  getState: async (threadid) => {
    try {
      return (await apiClient.get(`/mentor/state/${threadid}`)).data
    } catch (err) {
      if (err.response?.status === 404) return null
      throw err
    }
  }
}

export default mentorApi
