import { FastifyPluginAsync } from 'fastify'
import userRoutes from './routes/user.route'
import profileRoutes from './routes/profile.route'
import tagsRoutes from './routes/tags.route'
import citiesRoutes from './routes/city.route'
import captchaRoutes from './routes/captcha.route'
import messageRoutes from './routes/messaging.route'
import pushRoutes from './routes/push.routes'
import imageRoutes from './routes/image.route'
import discoverRoutes from './routes/discover.route'

const api: FastifyPluginAsync = async fastify => {
  fastify.register(userRoutes, { prefix: '/users' })
  fastify.register(tagsRoutes, { prefix: '/tags' })
  fastify.register(profileRoutes, { prefix: '/profiles' })
  fastify.register(messageRoutes, { prefix: '/messages' })
  fastify.register(citiesRoutes, { prefix: '/cities' })
  fastify.register(captchaRoutes, { prefix: '/captcha' })
  fastify.register(pushRoutes, { prefix: '/push' })
  fastify.register(imageRoutes, { prefix: '/image' })
  fastify.register(discoverRoutes, { prefix: '/discover' })
}

export default api
