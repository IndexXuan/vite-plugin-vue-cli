import path from 'path'
import type { Alias, Plugin, ResolvedConfig } from 'vite'
import semver from 'semver'
import { createFilter } from '@rollup/pluginutils'
import type { VueCliOptions } from './lib/options'
import { generateCode } from './lib/codegen'
import { clearRequireCache } from './lib/utils'
import { name } from '../package.json'
import Config from 'webpack-chain'
import merge from 'webpack-merge'
import express from 'express'
import { template } from 'lodash'
import methods from 'methods'
import cssLoaderCompat from './css-loader-compat'

const resolve = (p: string) => path.resolve(process.cwd(), p)
const response = express.response
declare module 'http' {
  interface ServerResponse {
    req: any
    app: any
    status: express.Response['status']
    json: express.Response['json']
  }
}

export type { VueCliOptions }

export { cssLoaderCompat }

export default function vueCli(): Plugin {
  let config: ResolvedConfig
  const filter = createFilter(
    ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.jsx', '**/*.vue'],
    'node_modules/**',
  )
  // vue.config.js
  let vueConfig: VueCliOptions = {}
  return {
    name,
    enforce: 'pre',
    config(config) {
      try {
        clearRequireCache()
        vueConfig = require(resolve('vue.config.js')) || {}
      } catch (e) {
        /**/
      }

      const devServer = vueConfig.devServer || {}
      const css = vueConfig.css || {}
      const runtimeCompiler = vueConfig.runtimeCompiler
      const chainableConfig = new Config()
      if (vueConfig.chainWebpack) {
        vueConfig.chainWebpack(chainableConfig)
      }
      // @see {@link https://github.com/vuejs/vue-cli/blob/4ce7edd3754c3856c760d126f7fa3928f120aa2e/packages/%40vue/cli-service/lib/Service.js#L248}
      const aliasOfChainWebpack = chainableConfig.resolve.alias.entries()
      // @see {@link temp/webpack*.js & temp/vue.config.js}
      const aliasOfConfigureWebpack = (() => {
        if (typeof vueConfig.configureWebpack === 'function') {
          let originConfig = chainableConfig.toConfig()
          const res = vueConfig.configureWebpack(originConfig)
          originConfig = merge(originConfig, res)
          if (res) {
            return (res.resolve && res.resolve.alias) || {}
          }
          return (originConfig.resolve && originConfig.resolve.alias) || {}
        } else {
          return vueConfig?.configureWebpack?.resolve?.alias || {}
        }
      })()

      /**
       * @see {@link https://github.com/vuejs/vue-cli/blob/aad72cfa7880a0e327be06b3b9c3ac3d3b3c9abc/packages/%40vue/babel-preset-app/index.js#L124}
       */
      let vueVersion = 2
      try {
        const Vue = require('vue')
        vueVersion = semver.major(Vue.version)
      } catch (e) {}
      const alias = {
        // @see {@link https://github.com/vuejs/vue-cli/blob/0dccc4af380da5dc269abbbaac7387c0348c2197/packages/%40vue/cli-service/lib/config/base.js#L70}
        // @see {@link https://github.com/vuejs/vue-cli/blob/ae967f769817b2e6dba19a3c0d171be48f67f2a2/packages/%40vue/cli-service/lib/config/base.js#L109}
        vue: require.resolve(
          vueVersion === 2
            ? runtimeCompiler
              ? 'vue/dist/vue.esm.js'
              : 'vue/dist/vue.runtime.esm.js'
            : runtimeCompiler
            ? 'vue/dist/vue.esm-bundler.js'
            : 'vue/dist/vue.runtime.esm-bundler.js',
        ),
        // for vue-cli common usecase
        '@': resolve('src'),
        // for vue-cli(webpack css-loader) in Vue SFC style background url or something
        // @see https://webpack.js.org/loaders/css-loader/#url, not work
        // '~@': resolve('src'),
        // high-priority for user-provided alias
        ...aliasOfConfigureWebpack,
        ...aliasOfChainWebpack,
      }

      config.resolve = config.resolve || {}
      // not support other plugins injected alias
      const aliasArr = Object.keys(alias).reduce<Alias[]>((result, key) => {
        result.push({
          // @see https://webpack.js.org/configuration/resolve/#resolvealias
          find: key.replace('$', ''),
          replacement: alias[key as keyof typeof alias],
        })
        return result
      }, [])
      /**
       * - /^~@\//
       *   *.vue  <template></template><style lang="xxx" scoped> @import '~@/styles/colors.less'; </style>
       *   *.less  @import '~@/styles/colors.less'
       *
       * - /^~/
       *   @see {@link https://github.com/vitejs/vite/issues/2185#issuecomment-784637827}
       *   support import '~ant-design-vue/xxx/index.css' => `~`
       */
      const defaultAlias = [
        {
          find: /^~@\//,
          replacement: path.join(process.cwd(), './src/'),
        },
        { find: /^~/, replacement: '' },
      ]
      const finalAlias = [...defaultAlias, ...aliasArr]
      config.resolve.alias = finalAlias

      config.base = process.env.PUBLIC_URL || vueConfig.publicPath || vueConfig.baseUrl || '/'

      // support BASE_URL like vue-cli
      config.define = {
        ...(config.define || {}),
        'process.env.BASE_URL': config.base,
      }

      config.css = config.css || {}
      config.css.preprocessorOptions = css.loaderOptions
      config.server = config.server || {}
      config.server.strictPort = false
      config.server.port = Number(process.env.PORT) || devServer.port
      ;(config.server.host = (
        process.env.DEV_HOST ||
        devServer.public ||
        devServer.host ||
        'localhost'
      )
        .replace('http://', '')
        .replace('https://', '')),
        (config.server.open = process.platform === 'darwin' || devServer.open)
      config.server.https = devServer.https
      config.server.proxy = devServer.proxy

      config.build = config.build || {}
      config.build.outDir = vueConfig.outputDir || 'dist'
      config.build.cssCodeSplit = Boolean(css.extract)
      config.build.minify = process.env.MODERN === 'true' ? 'esbuild' : 'terser'
      config.build.sourcemap =
        process.env.GENERATE_SOURCEMAP === 'true' || vueConfig.productionSourceMap || css.sourceMap
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    configureServer(server) {
      if (typeof vueConfig.devServer?.before === 'function') {
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
              // @ts-ignore
              app.use(path, switcher(method, cb))
            }
          })
          // @ts-ignore
          app.all = (path: string, cb: Function) => {
            // @ts-ignore
            app.use(path, cb)
          }

          // invoke user-provided service
          vueConfig.devServer.before(app)
        } catch (e) {
          console.error(e)
        }
      }
    },
    transformIndexHtml: {
      enforce: 'pre',
      transform(html) {
        const compiled = template(html)
        const vueCliData = {
          BASE_URL: config.base,
        }
        html = compiled({
          ...process.env,
          ...vueCliData,
        })
        return html
      },
    },
    async transform(code, id) {
      const includedFiles = filter(id)
      // remove comments
      const parsedCode = code
        .replace(/(\s*(?<!\\)\/\/.*$)|(\s*(?<!\\)\/\*[\s\S]*?(?<!\\)\*\/)/gm, '')
        .replace(/[\r\n\s]/g, '')
      const shouldTransformRequireContext = /require.context/g.test(parsedCode)
      const shouldTransformModuleHot = /module.hot/g.test(parsedCode)
      const shouldTransform = shouldTransformRequireContext || shouldTransformModuleHot
      if (!includedFiles || !shouldTransform) {
        return code
      }
      // use as keywords, not supported. e.g. var module=xxx
      // @see {@link https://webpack.js.org/api/module-variables/#modulehot-webpack-specific}
      if (parsedCode.includes(' module')) {
        console.error(
          `[${name}]: \`module\` is reserved keyword, should only use with \`module.hot\`. parsing error at ${id}`,
        )
        return process.exit(1)
      }
      code = generateCode(code, id, config.resolve.alias)
      return {
        code,
      }
    },
  }
}
