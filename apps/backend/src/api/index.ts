import { FastifyPluginAsync } from 'fastify'
import userRoutes from './routes/user.route'
import profileRoutes from './routes/profile.route'
import tagsRoutes from './routes/tags.route'
import citiesRoutes from './routes/city.route'
import captchaRoutes from './routes/captcha.route'
import messageRoutes from './routes/messaging.route'
import pushRoutes from './routes/push.routes'
import imageRoutes from './routes/image.route'
import findProfileRoutes from './routes/findProfile.route'
import appRoutes from './routes/app.route'
import interactionRoutes from './routes/interaction.route'
import postRoutes from './routes/post.route'

const api: FastifyPluginAsync = async fastify => {
  fastify.register(userRoutes, { prefix: '/users' })
  fastify.register(tagsRoutes, { prefix: '/tags' })
  fastify.register(profileRoutes, { prefix: '/profiles' })
  fastify.register(interactionRoutes, { prefix: '/interactions' })
  fastify.register(messageRoutes, { prefix: '/messages' })
  fastify.register(citiesRoutes, { prefix: '/cities' })
  fastify.register(captchaRoutes, { prefix: '/captcha' })
  fastify.register(pushRoutes, { prefix: '/push' })
  fastify.register(imageRoutes, { prefix: '/image' })
  fastify.register(findProfileRoutes, { prefix: '/find' })
  fastify.register(appRoutes, { prefix: '/app' })
  fastify.register(postRoutes, { prefix: '/posts' })
}

export default api
