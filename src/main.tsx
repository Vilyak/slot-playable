import 'reflect-metadata'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { bootstrapContainer } from '@/di/container'
import { store } from '@/ui/store/store'
import App from '@/ui/App'
import './index.css'

bootstrapContainer()

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>,
)
