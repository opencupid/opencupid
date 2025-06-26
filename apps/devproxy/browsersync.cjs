const { createProxyMiddleware } = require('http-proxy-middleware')
const serveStatic = require('serve-static')
const path = require('path')
const dotenv = require('dotenv')
// Load env vars from ../../.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

module.exports = {
  proxy: 'http://localhost:5173',
  https: {
    key: '../../certs/key.pem',
    cert: '../../certs/cert.pem',
  },
  port: 5174,
  open: false,
  reloadOnRestart: true,
  middleware: [
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      pathFilter: '/api',
    }),
    {
      route: '/images',
      handle: serveStatic(process.env.MEDIA_UPLOAD_DIR),
    },
  ],
}
