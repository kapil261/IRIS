import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  clearDocsError,
  selectDocs,
  selectHasProcessingDocs,
  selectReadyDocsCount
} from '../state/docsSlice'

const POLL_INTERVAL_MS = 3000

/**
 * Knowledge-base state + actions. Loads the list on mount and keeps polling while any
 * document is still being processed (chunking/embedding happens in the background server-side).
 */
export const useDocuments = () => {
  const dispatch = useDispatch()
  const { items, status, uploading, deletingIds, error } = useSelector(selectDocs)
  const hasProcessing = useSelector(selectHasProcessingDocs)
  const readyCount = useSelector(selectReadyDocsCount)

  useEffect(() => {
    dispatch(fetchDocuments())
  }, [dispatch])

  useEffect(() => {
    if (!hasProcessing) return undefined
    const id = setInterval(() => dispatch(fetchDocuments()), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [hasProcessing, dispatch])

  return {
    documents: items,
    isLoading: status === 'loading',
    uploading,
    deletingIds,
    readyCount,
    error,
    upload: useCallback((file) => dispatch(uploadDocument(file)), [dispatch]),
    remove: useCallback((id) => dispatch(deleteDocument(id)), [dispatch]),
    clearError: useCallback(() => dispatch(clearDocsError()), [dispatch])
  }
}

export default useDocuments
