import { createSlice } from '@reduxjs/toolkit'

const THEME_KEY = 'iris_theme'

const clampWidth = (w) => Math.max(220, Math.min(600, w))

const initialState = {
  theme: localStorage.getItem(THEME_KEY) || 'dark',
  sidebarOpen: true,
  sidebarWidth: 340,
  roadmapOpen: true,
  roadmapWidth: 340
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarWidth: (state, { payload }) => {
      state.sidebarWidth = clampWidth(payload)
    },
    setRoadmapOpen: (state, { payload }) => {
      state.roadmapOpen = payload
    },
    setRoadmapWidth: (state, { payload }) => {
      state.roadmapWidth = clampWidth(payload)
    }
  }
})

export const { toggleTheme, toggleSidebar, setSidebarWidth, setRoadmapOpen, setRoadmapWidth } = uiSlice.actions

export const selectUi = (state) => state.ui
export const THEME_STORAGE_KEY = THEME_KEY

export default uiSlice.reducer
