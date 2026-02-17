import Toast, { POSITION, type PluginOptions } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const theme = document.documentElement.getAttribute('data-bs-theme')

export const defaultOptions: PluginOptions = {
  position: POSITION.TOP_CENTER,
  timeout: 3000,
  closeOnClick: false,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: false,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: true,
  closeButton: false,
  icon: false,
  rtl: false,
}

export default function registerToast(app: any) {
  app.use(Toast, {
    ...defaultOptions,
    shareAppContext: true,
  })
}
