/**
 * Plugin options.
 */

export interface VueCliOptions {
  baseUrl?: string
  publicPath?: string
  outputDir?: string
  pages?: Record<string, any>
  runtimeCompiler?: boolean
  productionSourceMap?: boolean
  css?: {
    sourceMap?: boolean
    loaderOptions?: Record<string, any>
    extract?: any
  }
  configureWebpack?: any
  chainWebpack?: any
  devServer?: {
    open?: boolean
    public?: any
    port?: number
    proxy?: any
    https?: any
  }
  pluginOptions?: Record<string, any>
}

export type UserOptions = Partial<VueCliOptions>
