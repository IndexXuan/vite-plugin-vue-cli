import type Config from 'webpack-chain'
import type webpack from 'webpack'

/**
 * Plugin options.
 */
export interface VueCliOptions {
  baseUrl?: string
  publicPath?: string
  outputDir?: string
  pages?: Record<string, any>
  lintOnSave?: boolean | 'warning' | 'default' | 'error'
  runtimeCompiler?: boolean
  productionSourceMap?: boolean
  css?: {
    sourceMap?: boolean
    loaderOptions?: Record<string, any>
    extract?: any
  }
  configureWebpack?:
    | {
        externals?: Record<string, string>
        resolve?: {
          alias?: Record<string, string>
          extensions?: string[]
        }
      }
    | ((config: webpack.Configuration) => webpack.Configuration)
  chainWebpack?: (config: Config) => any // dont care about the return value.
  devServer?: {
    open?: boolean
    overlay?:
      | boolean
      | {
          warnings?: boolean
          errors?: boolean
        }
    host?: string
    public?: string
    port?: number
    proxy?: any
    https?: any
    before?: Function
  }
  pluginOptions?: Record<string, any>
}

export type UserOptions = Partial<VueCliOptions>
