import type { Plugin, ResolvedConfig } from 'vite'
import { createFilter } from '@rollup/pluginutils'
import type { UserOptions } from './lib/options'
import { generateCode } from './lib/codegen'
import { name } from '../package.json'

export default function vueCli(userOptions: UserOptions = {}): Plugin {
  const options: UserOptions = {
    ...userOptions,
  }
  let config: ResolvedConfig
  const filter = createFilter(
    ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.jsx', '**/*.vue'],
    'node_modules/**',
  )
  return {
    name,
    enforce: 'pre',
    config(config) {
      const devServer = options.devServer || {}
      const css = options.css || {}

      config.base = process.env.PUBLIC_URL || options.publicPath || '/'

      config.css = config.css || {}
      config.css.preprocessorOptions = options?.css?.loaderOptions
      config.server = config.server || {}
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

    configResolved(resolvedConfig) {
      config = resolvedConfig
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
