import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import docsApi from '../api/docsApi'
import { getErrorMessage } from '../../../shared/api/apiClient'
import { logout } from '../../auth/state/authSlice'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'txt']

const initialState = {
  items: [],
  status: 'idle', // idle | loading | ready | failed  (the list fetch)
  uploading: false,
  deletingIds: [],
  error: null
}

export const fetchDocuments = createAsyncThunk('docs/fetch', async (_, { rejectWithValue }) => {
  try {
    return await docsApi.list()
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not load documents'))
  }
})

export const uploadDocument = createAsyncThunk('docs/upload', async (file, { dispatch, rejectWithValue }) => {
  const ext = file.name.split('.').pop().toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) return rejectWithValue('Only PDF and TXT files are allowed.')
  if (file.size > MAX_UPLOAD_BYTES) return rejectWithValue('File size must be under 10MB.')

  try {
    const data = await docsApi.upload(file)
    dispatch(fetchDocuments())
    return data.document
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Upload failed. Try again.'))
  }
})

export const deleteDocument = createAsyncThunk('docs/delete', async (id, { rejectWithValue }) => {
  try {
    await docsApi.remove(id)
    return id
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not delete document'))
  }
})

const docsSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    clearDocsError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        // Background polling refreshes shouldn't flash a loading state
        if (state.status === 'idle') state.status = 'loading'
      })
      .addCase(fetchDocuments.fulfilled, (state, { payload }) => {
        state.status = 'ready'
        state.items = payload
      })
      .addCase(fetchDocuments.rejected, (state, { payload }) => {
        state.status = 'failed'
        state.error = payload
      })

      .addCase(uploadDocument.pending, (state) => {
        state.uploading = true
        state.error = null
      })
      .addCase(uploadDocument.fulfilled, (state, { payload }) => {
        state.uploading = false
        // Show the new "processing" row immediately, before the refetch lands
        if (payload && !state.items.some((d) => d._id === payload._id)) state.items.unshift(payload)
      })
      .addCase(uploadDocument.rejected, (state, { payload }) => {
        state.uploading = false
        state.error = payload
      })

      .addCase(deleteDocument.pending, (state, { meta }) => {
        state.deletingIds.push(meta.arg)
      })
      .addCase(deleteDocument.fulfilled, (state, { payload }) => {
        state.deletingIds = state.deletingIds.filter((id) => id !== payload)
        state.items = state.items.filter((d) => d._id !== payload)
      })
      .addCase(deleteDocument.rejected, (state, { meta, payload }) => {
        state.deletingIds = state.deletingIds.filter((id) => id !== meta.arg)
        state.error = payload
      })

      .addCase(logout.fulfilled, () => initialState)
  }
})

export const { clearDocsError } = docsSlice.actions

export const selectDocs = (state) => state.docs
export const selectHasProcessingDocs = (state) => state.docs.items.some((d) => d.status === 'processing')
export const selectReadyDocsCount = (state) => state.docs.items.filter((d) => d.status === 'ready').length

export default docsSlice.reducer
