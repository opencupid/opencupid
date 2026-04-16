import { bus } from './bus'

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      bus.emit('app:hidden')
    } else {
      bus.emit('app:visible')
    }
  })
}
