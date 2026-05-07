import { bus } from '@/lib/bus'

bus.on('auth:login', () => {

  import('./bootstrap')
    .then(({ useBootstrap }) => useBootstrap().onLogin())
    .catch((err) => console.warn('Failed to load bootstrap:', err))
})
