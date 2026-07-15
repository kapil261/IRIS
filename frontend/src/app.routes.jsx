import {createBrowserRouter} from 'react-router'
import Home from './features/pages/Home'
import Login from './features/pages/Login'
import Signup from './features/pages/Signup'
import ProtectedRoute from './features/components/ProtectedRoute'

 export const router = createBrowserRouter([
    {
        path:"/",
        element :<ProtectedRoute><Home/></ProtectedRoute>
    },
    {
        path:"/login",
        element :<Login/>
    },
    {
        path:"/signup",
        element :<Signup/>
    }
])

export default router