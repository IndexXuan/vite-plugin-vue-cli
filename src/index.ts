import type { Plugin, ResolvedConfig } from 'vite'
import { createFilter } from '@rollup/pluginutils'
import type { UserOptions } from './lib/options'
import { generateCode } from './lib/codegen'
import { name } from '../package.json'
import express from 'express'
import methods from 'methods'

const response = express.response

declare module 'http' {
  interface ServerResponse {
    req: any
    app: any
    status: express.Response['status']
    json: express.Response['json']
  }
}

export default function vueCli(userOptions: UserOptions = {}): Plugin {
  const options: UserOptions = {
    ...userOptions,
  }
  let config: ResolvedConfig
  const filter = createFilter(
    ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.jsx', '**/*.vue'],
    'node_modules/**',
  )
  const devServer = options.devServer || {}
  const css = options.css || {}
  return {
    name,
    enforce: 'pre',
    config(config) {
      config.base = process.env.PUBLIC_URL || options.publicPath || options.baseUrl || '/'

      config.css = config.css || {}
      config.css.preprocessorOptions = css.loaderOptions
      config.server = config.server || {}
      config.server.strictPort = true
      config.server.port = Number(process.env.PORT) || devServer.port
      ;(config.server.host = (process.env.DEV_HOST || devServer.public || devServer.host || '')
        .replace('http://', '')
        .replace('https://', '')),
        (config.server.open = process.platform === 'darwin' || devServer.open)
      config.server.https = devServer.https
      config.server.proxy = devServer.proxy

      config.build = config.build || {}
      config.build.outDir = options.outputDir || 'dist'
      config.build.cssCodeSplit = Boolean(css.extract)
      config.build.minify = process.env.MODERN === 'true' ? 'esbuild' : 'terser'
      config.build.sourcemap =
        process.env.GENERATE_SOURCEMAP === 'true' || options.productionSourceMap || css.sourceMap
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    configureServer(server) {
      if (typeof devServer.before === 'function') {
        try {
          // alias as app
          const app = server.middlewares

          // add res.json/status/... methods
          app.use((req, res, next) => {
            if (typeof res.status === 'function' && typeof res.json === 'function') {
              next()
            }
            res.req = req
            res.app = app
            Object.keys(response).forEach(method => {
              // @ts-ignore
              res[method] = response[method].bind(res)
            })
            next()
          })

          // add app.get/post/... methods
          // @see https://github.com/senchalabs/connect/issues/1100#issuecomment-360214055
          function switcher(method: typeof methods[number], cb: Function) {
            // @ts-ignore
            return (req, res, next) => {
              return req.method.toLowerCase() === method ? cb(req, res, next) : next()
            }
          }
          methods.forEach(method => {
            // @ts-ignore
            app[method] = (path: string, cb: Function) => {
              app.use(path, switcher(method, cb))
            }
          })

          // invoke user-provided service
          devServer.before(app)
        } catch (e) {
          console.error(e)
        }
      }
    },

    async transform(code, id) {
      const includedFiles = filter(id)
      const shouldTransformRequireContext = /require.context/g.test(code)
      const shouldTransformModuleHot = /module.hot/g.test(code)
      const shouldTransform = shouldTransformRequireContext || shouldTransformModuleHot
      if (!includedFiles || !shouldTransform) {
        return
      }
      code = generateCode(code, id, config.resolve.alias)
      return {
        code,
      }
    },
  }
}

export type { UserOptions as VueCliOptions }
