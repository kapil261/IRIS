import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectUi,
  toggleTheme,
  toggleSidebar,
  setSidebarWidth,
  setRoadmapOpen,
  setRoadmapWidth,
  THEME_STORAGE_KEY
} from '../state/uiSlice'

export const useUi = () => {
  const dispatch = useDispatch()
  const ui = useSelector(selectUi)

  return {
    ...ui,
    toggleTheme: useCallback(() => dispatch(toggleTheme()), [dispatch]),
    toggleSidebar: useCallback(() => dispatch(toggleSidebar()), [dispatch]),
    setSidebarWidth: useCallback((w) => dispatch(setSidebarWidth(w)), [dispatch]),
    setRoadmapOpen: useCallback((open) => dispatch(setRoadmapOpen(open)), [dispatch]),
    setRoadmapWidth: useCallback((w) => dispatch(setRoadmapWidth(w)), [dispatch])
  }
}

/** Apply the theme to <html> and persist it. Mount once near the app root. */
export const useThemeSync = () => {
  const theme = useSelector((state) => state.ui.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])
}

/**
 * Mouse-drag resize for side panels. `direction` is 1 for a panel on the left edge
 * (drag right = wider) and -1 for one on the right edge (drag left = wider).
 */
export const useDragResize = (currentWidth, onResize, direction = 1) =>
  useCallback((e) => {
    e.preventDefault()
    document.body.classList.add('resizing')
    const startX = e.clientX
    const startWidth = currentWidth

    const handleMove = (moveEvent) => onResize(startWidth + direction * (moveEvent.clientX - startX))
    const handleUp = () => {
      document.body.classList.remove('resizing')
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [currentWidth, onResize, direction])

export default useUi
