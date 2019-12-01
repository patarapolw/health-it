import { ServerMiddleware } from '@nuxt/types'
import fs from 'fs'
import path from 'path'

const buildMiddleware: ServerMiddleware = (req, res, next) => {
  const ROOT = '../data'
  const filePath = path.join(ROOT, req.url)
  if (req.method === 'GET') {
    return res.end(fs.readFileSync(filePath, "utf8"))
  } else if (req.method === "PUT") {
    fs.writeFileSync(filePath, req.body)
    res.statusCode = 201
    return res.end()
  } else if (req.method === "DELETE") {
    fs.unlinkSync(filePath)
    res.statusCode = 201
    return res.end()
  }
  next()
}

export default buildMiddleware