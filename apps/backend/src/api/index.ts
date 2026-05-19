import { FastifyPluginAsync } from 'fastify'
import authRoutes from './routes/auth.route'
import userRoutes from './routes/user.route'
import profileRoutes from './routes/profile.route'
import tagsRoutes from './routes/tags.route'
import captchaRoutes from './routes/captcha.route'
import messageRoutes from './routes/messaging.route'
import pushRoutes from './routes/push.routes'
import imageRoutes from './routes/image.route'
import findProfileRoutes from './routes/findProfile.route'
import appRoutes from './routes/app.route'
import interactionRoutes from './routes/interaction.route'
import postRoutes from './routes/content/post.route'
import eventRoutes from './routes/content/event.route'
import communityRoutes from './routes/content/community.route'
import contentImageRoutes from './routes/content/image.route'
import contentRoutes from './routes/content.route'
import callRoutes from './routes/call.route'
import adminRoutes from './routes/admin.route'
import browseRoutes from './routes/browse.route'
import searchRoutes from './routes/search.route'
import unsubscribeRoutes from './routes/unsubscribe.route'

const api: FastifyPluginAsync = async (fastify) => {
  fastify.register(authRoutes, { prefix: '/auth' })
  fastify.register(userRoutes, { prefix: '/users' })
  fastify.register(tagsRoutes, { prefix: '/tags' })
  fastify.register(profileRoutes, { prefix: '/profiles' })
  fastify.register(interactionRoutes, { prefix: '/interactions' })
  fastify.register(messageRoutes, { prefix: '/messages' })
  fastify.register(captchaRoutes, { prefix: '/captcha' })
  fastify.register(pushRoutes, { prefix: '/push' })
  fastify.register(imageRoutes, { prefix: '/image' })
  fastify.register(findProfileRoutes, { prefix: '/find' })
  fastify.register(appRoutes, { prefix: '/app' })
  fastify.register(postRoutes, { prefix: '/content/posts' })
  fastify.register(eventRoutes, { prefix: '/content/events' })
  fastify.register(communityRoutes, { prefix: '/content/communities' })
  fastify.register(contentImageRoutes, { prefix: '/content' })
  fastify.register(contentRoutes, { prefix: '/content' })
  fastify.register(callRoutes, { prefix: '/calls' })
  fastify.register(adminRoutes, { prefix: '/admin' })
  fastify.register(browseRoutes, { prefix: '/browse' })
  fastify.register(searchRoutes, { prefix: '/search' })
  fastify.register(unsubscribeRoutes, { prefix: '/unsubscribe' })
}

export default api
