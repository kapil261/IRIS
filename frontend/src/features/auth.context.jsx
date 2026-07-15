import { useState, useEffect, createContext, useContext } from 'react'
import axios from 'axios'

export const authContext = createContext()

const API_URL = "http://localhost:3000/api/auth"

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Load token and user on startup
    useEffect(() => {
        const storedToken = localStorage.getItem('iris_token')
        const storedUser = localStorage.getItem('iris_user')
        if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
        }
        setLoading(false)
    }, [])

    const login = async (email, password) => {
        setLoading(true)
        setError(null)
        try {
            const res = await axios.post(`${API_URL}/login`, { email, password })
            const { token: receivedToken, user: receivedUser } = res.data
            
            localStorage.setItem('iris_token', receivedToken)
            localStorage.setItem('iris_user', JSON.stringify(receivedUser))
            
            setToken(receivedToken)
            setUser(receivedUser)
            return receivedUser
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Login failed'
            setError(errMsg)
            throw new Error(errMsg)
        } finally {
            setLoading(false)
        }
    }

    const signup = async (name, email, password) => {
        setLoading(true)
        setError(null)
        try {
            const res = await axios.post(`${API_URL}/signup`, { name, email, password })
            const { token: receivedToken, user: receivedUser } = res.data
            
            localStorage.setItem('iris_token', receivedToken)
            localStorage.setItem('iris_user', JSON.stringify(receivedUser))
            
            setToken(receivedToken)
            setUser(receivedUser)
            return receivedUser
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Registration failed'
            setError(errMsg)
            throw new Error(errMsg)
        } finally {
            setLoading(false)
        }
    }

    const logout = () => {
        localStorage.removeItem('iris_token')
        localStorage.removeItem('iris_user')
        setToken(null)
        setUser(null)
    }

    return (
        <authContext.Provider
            value={{
                user,
                token,
                loading,
                error,
                login,
                signup,
                logout,
                isAuthenticated: !!token
            }}
        >
            {!loading && children}
        </authContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(authContext)
}

export default AuthProvider
