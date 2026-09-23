import { configureStore } from '@reduxjs/toolkit'
import authReducer, { logout } from '../features/auth/state/authSlice'
import chatReducer from '../features/chat/state/chatSlice'
import docsReducer from '../features/docs/state/docsSlice'
import mentorReducer from '../features/mentor/state/mentorSlice'
import uiReducer from '../features/ui/state/uiSlice'
import { setUnauthorizedHandler } from '../shared/api/apiClient'

// One reducer per feature. Each non-auth slice resets itself on `auth/logout`.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    docs: docsReducer,
    mentor: mentorReducer,
    ui: uiReducer
  },
  devTools: import.meta.env.DEV
})

// Any API call rejected with 401 (expired/invalid token) signs the user out app-wide.
setUnauthorizedHandler(() => {
  if (store.getState().auth.token) store.dispatch(logout())
})

export default store
