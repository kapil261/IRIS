// Single place that knows how the session is persisted in the browser.
const TOKEN_KEY = 'iris_token'
const USER_KEY = 'iris_user'

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),

  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  save: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  saveUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),

  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

export default tokenStorage
