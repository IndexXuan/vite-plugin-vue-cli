import type { Plugin } from 'vite'

const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
const cssLangRE = new RegExp(cssLangs)
const cssUrlRE = /(?:^|[^\w\-\u0080-\uffff])url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/
const vueLangs = /\.(vue)$|vue&type=template|vue&type=style/
const publicRe = /(['|"])~?\/?public(\/)/g

/**
 * Plugin applied before user plugins
 */
export default function cssLoaderCompat(): Plugin {
  return {
    name: 'vite-plugin-vue-cli:css-loader-compat',
    enforce: 'pre',

    async transform(code, id) {
      let ret = code
      if (!cssLangRE.test(id) && !(vueLangs.test(id) && publicRe.test(code))) {
        return
      }
      /**
       * @see {@link https://github.com/vuejs/vue-next/blob/ab6e927041e4082acac9a5effe332557e70e4f2a/packages/compiler-sfc/src/templateUtils.ts#L24}
       */
      ret = ret.replace(cssUrlRE, matchedUrl => {
        return matchedUrl.replace('~', '')
      })

      ret = ret.replace(publicRe, '$1$2')
      return ret
    },
  }
}
