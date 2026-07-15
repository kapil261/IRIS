import { RouterProvider } from 'react-router'
import { router } from './app.routes'
import './features/style/Home.scss'
import Home from './features/pages/Home.jsx'
import "./features/shared/global.scss";
import MessageProvider from './features/message.context.jsx'
import AuthProvider from './features/auth.context.jsx'

const App = () => {
  return (
    <div>
      <AuthProvider>
        <MessageProvider>
          <RouterProvider router={router} />
        </MessageProvider>
      </AuthProvider>
    </div>
  )
}

export default App