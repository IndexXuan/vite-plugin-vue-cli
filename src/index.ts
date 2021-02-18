import type { Plugin } from 'vite'
import type { UserOptions } from './lib/options'

export default function vueCli(userOptions: UserOptions = {}): Plugin {
  const options: UserOptions = {
    ...userOptions,
  }
  return {
    name: 'vite-plugin-vue-cli',
    enforce: 'pre',
    config(config) {
      const devServer = options.devServer || {}
      const css = options.css || {}

      config.base = process.env.PUBLIC_URL || options.publicPath || '/'

      config.css = config.css || {}
      ;(config.css.preprocessorOptions = options?.css?.loaderOptions),
        (config.server = config.server || {})
      config.server.strictPort = true
      config.server.port = Number(process.env.PORT) || devServer.port
      config.server.host = process.env.DEV_HOST || devServer.public
      config.server.open = process.platform === 'darwin' || devServer.open
      config.server.https = devServer.https
      config.server.proxy = devServer.proxy

      config.build = config.build || {}
      config.build.outDir = options.outputDir || 'dist'
      config.build.cssCodeSplit = Boolean(css.extract)
      config.build.minify = process.env.MODERN === 'true' ? 'esbuild' : 'terser'
      config.build.sourcemap =
        process.env.GENERATE_SOURCEMAP === 'true' || options.productionSourceMap || css.sourceMap
    },
  }
}

export type { UserOptions as VueCliOptions }
