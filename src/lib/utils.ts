const toString = Object.prototype.toString

export function is(val: unknown, type: string) {
  return toString.call(val) === `[object ${type}]`
}

export function isString(val: unknown): val is string {
  return is(val, 'String')
}

export function isRegExp(val: unknown): val is RegExp {
  return is(val, 'RegExp')
}

export function isArray(val: any): val is any[] {
  return val && Array.isArray(val)
}

export function clearRequireCache() {
  Object.keys(require.cache).forEach(function (key) {
    delete require.cache[key]
  })
}

/**
 * /(['|"])\/?public(\/)/g
 *   - <template> <img src='~public/img/403.png'/> </template>"
 *   - <template><img src="~/public/img/403.svg" /></template>
 *
 *   - <style> #app{ background: url('~public/img/403.png') } </style>
 *
 * @param code : the code of Vue SFC
 * @param id : file path
 */
export function templateTransform(code: string, id: string) {
  const vueLangs = /\.(vue)$|vue&type=template|vue&type=style/
  const publicReg = /(['|"])~?\/?public(\/)/g

  // Avoid duplicate exec
  if (vueLangs.test(id) && publicReg.test(code)) {
    code = code.replace(publicReg, '$1$2')
  }

  return code
}
