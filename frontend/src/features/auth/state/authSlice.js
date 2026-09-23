import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import authApi from '../api/authApi'
import tokenStorage from '../../../shared/utils/tokenStorage'
import { getErrorMessage } from '../../../shared/api/apiClient'

const initialState = {
  user: tokenStorage.getUser(),
  token: tokenStorage.getToken(),
  // 'idle' until the stored token has been checked against GET /auth/me
  sessionStatus: 'idle', // idle | checking | ready
  submitStatus: 'idle', // idle | loading | failed (login/signup form)
  error: null,
  // Public auth settings from GET /api/auth/config (the Google client id lives in Backend/.env)
  googleClientId: null,
  configStatus: 'idle' // idle | loading | ready | failed
}

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const data = await authApi.login(email, password)
    tokenStorage.save(data.token, data.user)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Login failed'))
  }
})

export const signup = createAsyncThunk('auth/signup', async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const data = await authApi.signup(name, email, password)
    tokenStorage.save(data.token, data.user)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Registration failed'))
  }
})

export const fetchAuthConfig = createAsyncThunk('auth/fetchConfig', async (_, { rejectWithValue }) => {
  try {
    return await authApi.config()
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Could not load sign-in options'))
  }
})

/** Exchange a Google ID token (from Google Identity Services) for an IRIS session. */
export const googleLogin = createAsyncThunk('auth/googleLogin', async (credential, { rejectWithValue }) => {
  try {
    const data = await authApi.google(credential)
    tokenStorage.save(data.token, data.user)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err, 'Google sign-in failed'))
  }
})

/** Validate the stored token on app start; drops the session if the server rejects it. */
export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { rejectWithValue }) => {
  if (!tokenStorage.getToken()) return rejectWithValue(null)
  try {
    const data = await authApi.me()
    tokenStorage.saveUser(data.user)
    return data.user
  } catch (err) {
    tokenStorage.clear()
    return rejectWithValue(getErrorMessage(err, 'Session expired'))
  }
})

/** Every other slice listens for this action to reset itself. */
export const logout = createAsyncThunk('auth/logout', async () => {
  tokenStorage.clear()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    const onSubmitPending = (state) => {
      state.submitStatus = 'loading'
      state.error = null
    }
    const onSubmitFulfilled = (state, { payload }) => {
      state.submitStatus = 'idle'
      state.token = payload.token
      state.user = payload.user
      state.sessionStatus = 'ready'
    }
    const onSubmitRejected = (state, { payload }) => {
      state.submitStatus = 'failed'
      state.error = payload
    }

    builder
      .addCase(login.pending, onSubmitPending)
      .addCase(login.fulfilled, onSubmitFulfilled)
      .addCase(login.rejected, onSubmitRejected)
      .addCase(signup.pending, onSubmitPending)
      .addCase(signup.fulfilled, onSubmitFulfilled)
      .addCase(signup.rejected, onSubmitRejected)
      .addCase(googleLogin.pending, onSubmitPending)
      .addCase(googleLogin.fulfilled, onSubmitFulfilled)
      .addCase(googleLogin.rejected, onSubmitRejected)
      .addCase(fetchAuthConfig.pending, (state) => {
        state.configStatus = 'loading'
      })
      .addCase(fetchAuthConfig.fulfilled, (state, { payload }) => {
        state.configStatus = 'ready'
        state.googleClientId = payload.googleClientId || null
      })
      .addCase(fetchAuthConfig.rejected, (state) => {
        state.configStatus = 'failed'
      })
      .addCase(restoreSession.pending, (state) => {
        state.sessionStatus = 'checking'
      })
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        state.sessionStatus = 'ready'
        state.user = payload
      })
      .addCase(restoreSession.rejected, (state) => {
        state.sessionStatus = 'ready'
        state.user = null
        state.token = null
      })
      .addCase(logout.fulfilled, (state) => ({
        ...initialState,
        user: null,
        token: null,
        sessionStatus: 'ready',
        // sign-in options don't depend on who was logged in
        googleClientId: state.googleClientId,
        configStatus: state.configStatus
      }))
  }
})

export const { clearAuthError } = authSlice.actions

export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => !!state.auth.token

export default authSlice.reducer
