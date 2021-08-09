import type { Plugin } from 'vite'

const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
const cssLangRE = new RegExp(cssLangs)
const cssUrlRE = /(?:^|[^\w\-\u0080-\uffff])url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/
const vueLangRE = /\.(vue)$|vue&type=template|vue&type=style/
const publicRE = /(['|"]?)~?\/?public(\/)/g

/**
 * Plugin applied before user plugins
 */
export default function cssLoaderCompat(): Plugin {
  return {
    name: 'vite-plugin-vue-cli:css-loader-compat',
    enforce: 'pre',

    async transform(code, id) {
      // not *.vue template or style, bypass
      if (!vueLangRE.test(id)) {
        return
      }
      // not css pre/post tools, bypass
      // and not include public token, bypass
      if (!cssLangRE.test(id) && !publicRE.test(code)) {
        return
      }

      let ret = code
      ret = ret.replace(publicRE, '$1$2')
      /**
       * @see {@link https://github.com/vuejs/vue-next/blob/ab6e927041e4082acac9a5effe332557e70e4f2a/packages/compiler-sfc/src/templateUtils.ts#L24}
       */
      ret = ret.replace(cssUrlRE, matchedUrl => {
        return matchedUrl.replace('~', '')
      })

      return ret
    },
  }
}
