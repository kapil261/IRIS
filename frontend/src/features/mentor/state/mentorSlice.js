import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import mentorApi from '../api/mentorApi'
import { getErrorMessage } from '../../../shared/api/apiClient'
import { logout } from '../../auth/state/authSlice'

// Mentor roadmap/progress, keyed by chat threadid (the backend's ProjectState, mirrored).
const initialState = {
  byThread: {}, // { [threadid]: { roadmap, phase, progress, currentTaskIndex, currentFileIndex, projectName } | null }
  status: {}, // { [threadid]: 'loading' | 'ready' | 'failed' }
  error: null
}

export const fetchMentorState = createAsyncThunk('mentor/fetchState', async (threadid, { rejectWithValue }) => {
  try {
    return { threadid, data: await mentorApi.getState(threadid) }
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not load the project roadmap'))
  }
})

const mentorSlice = createSlice({
  name: 'mentor',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMentorState.pending, (state, { meta }) => {
        state.status[meta.arg] = 'loading'
      })
      .addCase(fetchMentorState.fulfilled, (state, { payload }) => {
        state.byThread[payload.threadid] = payload.data
        state.status[payload.threadid] = 'ready'
        state.error = null
      })
      .addCase(fetchMentorState.rejected, (state, { meta, payload }) => {
        state.status[meta.arg] = 'failed'
        state.error = payload
      })
      .addCase(logout.fulfilled, () => initialState)
  }
})

/** Memoized per-thread view the roadmap widget renders from (adds the current file path). */
export const makeSelectMentorView = (threadid) => createSelector(
  [(state) => (threadid ? state.mentor.byThread[threadid] : null)],
  (data) => {
    if (!data) return null
    const currentFile = data.roadmap?.[data.currentTaskIndex]?.files?.[data.currentFileIndex]
    return {
      ...data,
      currentFilePath: data.phase === 'done' ? null : currentFile?.path || null
    }
  }
)

export default mentorSlice.reducer
