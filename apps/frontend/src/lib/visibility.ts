import { bus } from './bus'

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    bus.emit('app:hidden')
  } else {
    bus.emit('app:visible')
  }
})
