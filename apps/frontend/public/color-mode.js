// Applies the colour mode before first paint, so the splash screen and the
// first render never flash the wrong palette. Loaded as a blocking script
// from index.html. Mirrors useAppColorMode(), which takes over once the app
// boots: same storage key, same fallback to the browser's preference.
;(function () {
  var stored = localStorage.getItem('color-mode')
  var dark =
    stored === 'dark' ||
    (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light')
})()
