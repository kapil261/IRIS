import { Navigate } from 'react-router'
import { useAuth } from '../auth.context'

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                backgroundColor: '#1e1e1f',
                color: '#f0f0f0',
                fontFamily: 'sans-serif'
            }}>
                <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTopColor: '#dd4200',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '1rem'
                }}></div>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute
