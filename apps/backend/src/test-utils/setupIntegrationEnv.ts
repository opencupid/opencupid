import { loadEnv } from 'vite'
import path from 'path'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL="postgresql://appuser:secret@localhost:5432/app_test"

const root = path.resolve(__dirname, '../..') // your project root
const env = loadEnv('test', root, '') // third arg: '' = load all keys (not just VITE_)

Object.assign(process.env, env)

console.log('✅ Loaded DATABASE_URL from .env.test:', process.env.DATABASE_URL)
