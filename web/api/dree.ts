import { ServerMiddleware } from '@nuxt/types'
import path from 'path'
import { scan } from 'dree'

const dreeMiddleware: ServerMiddleware = (req, res, next) => {
  const ROOT = '../data'
  const filePath = path.join(ROOT, req.url)

  res.setHeader("Content-Type", "application/json")
  res.end(req.url ? JSON.stringify(scan(filePath)) : undefined)
}

export default dreeMiddleware