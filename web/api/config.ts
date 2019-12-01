import { ServerMiddleware } from '@nuxt/types'
import yaml from 'js-yaml'
import fs from 'fs'

const configMiddleware: ServerMiddleware = (req, res, next) => {
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(yaml.safeLoad(fs.readFileSync('../config.yaml', 'utf8'))))
}

export default configMiddleware