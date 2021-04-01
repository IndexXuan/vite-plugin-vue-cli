import type { Alias } from 'vite'
import { transformSync } from '@babel/core'
import type { BabelFileResult } from '@babel/core'
import { findRequireContextSyntaxResult, findModuleHotSyntaxResult } from './ast'
import { resolveDir, resolveImport } from './resolve'

function patchCodeWithRequireContext(
  babelResult: BabelFileResult,
  code: string,
  id: string,
  alias: Alias[],
) {
  const resultData = findRequireContextSyntaxResult(babelResult, id, alias)
  let head = ''
  const body = resultData.reduceRight((res, data) => {
    const { regexp, start, end, deep, dirname, dynamicImport } = data

    const files = resolveDir(dirname, deep, regexp)

    const { importCode, importFnCode } = resolveImport(files, dirname, dynamicImport)

    head += importCode
    const newRes = [res.slice(0, start), importFnCode, res.slice(end)].join('')
    return newRes
  }, code)

  return [head, body].join('\n\n')
}

function patchCodeWithModuleHot(babelResult: BabelFileResult, code: string) {
  const resultData = findModuleHotSyntaxResult(babelResult)
  const body = resultData.reduceRight((res, data) => {
    const { start, end } = data
    const codeLen = 'module.hot'.length
    const newRes = [res.slice(0, start), 'import.meta.hot', res.slice(end + codeLen)].join('')
    return newRes
  }, code)
  return body
}

export function generateCode(code: string, id: string, alias: Alias[]) {
  // setup
  const plugins = []
  if (id.endsWith('.tsx') || id.endsWith('.ts')) {
    plugins.push([
      require('@babel/plugin-transform-typescript'),
      { isTSX: true, allowExtensions: true },
    ])
  }

  // 1. transform require.context
  const babelResultByRequireContext = transformSync(code, {
    filename: 'require-context-transform.ts',
    ast: true,
    plugins,
    sourceMaps: false,
    sourceFileName: id,
  })

  if (!babelResultByRequireContext) {
    return code
  }
  const codeWithRequireContextTransformed = patchCodeWithRequireContext(
    babelResultByRequireContext,
    code,
    id,
    alias,
  )

  // 2. transform module.hot
  const babelResultByModuleHot = transformSync(codeWithRequireContextTransformed, {
    filename: 'module-hot.ts',
    ast: true,
    plugins,
    sourceMaps: false,
    sourceFileName: id,
  })

  if (!babelResultByModuleHot) {
    return code
  }

  const codeWithRequireContextAndModuleHotTransformed = patchCodeWithModuleHot(
    babelResultByModuleHot,
    codeWithRequireContextTransformed,
  )

  // 3. anything else ?

  return codeWithRequireContextAndModuleHotTransformed
}
