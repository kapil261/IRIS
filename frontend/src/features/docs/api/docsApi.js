import apiClient from '../../../shared/api/apiClient'

export const docsApi = {
  list: async () => (await apiClient.get('/documents')).data,

  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return (await apiClient.post('/documents/upload', formData)).data
  },

  remove: async (id) => (await apiClient.delete(`/documents/${id}`)).data
}

export default docsApi
