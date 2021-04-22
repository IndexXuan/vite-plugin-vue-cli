import type { BabelFileResult } from '@babel/core'
import path from 'path'
import type { Alias } from 'vite'
import { isArray, isString, isRegExp } from './utils'
import traverse from '@babel/traverse'
import * as t from '@babel/types'

export interface RequireContextResult {
  dirname: string
  deep: boolean
  regexp: RegExp
  start: number
  end: number
  dynamicImport: boolean
}

function parseAlias(alias: Alias[], dir: string) {
  let realDir: string = dir
  let match = false

  if (isArray(alias)) {
    for (let index = 0; index < alias.length; index++) {
      const { find, replacement } = alias[index]
      if (isString(find)) {
        if (dir.startsWith(find)) {
          realDir = dir.replace(new RegExp(`^${find}`), replacement)
          match = true
        }
      } else if (isRegExp(find)) {
        // if matched, then mark match as true
        if (dir.match(find)) {
          realDir = dir.replace(find, replacement)
          match = true
        }
      }
    }
  }
  return {
    realDir,
    match,
  }
}

export function findRequireContextSyntaxResult(
  babelResult: BabelFileResult,
  id: string,
  alias: Alias[],
): RequireContextResult[] {
  const expressionResult = extractRequireContextExpression(babelResult) || []

  const currentCodeDirName = path.dirname(id)
  return expressionResult.map(er => {
    const { start, end, args } = er
    const [directory = './', useSubdirectories = true, regexp = /^\.\//, mode = 'sync'] = args

    const { realDir, match } = parseAlias(alias, directory)
    const dirname = match ? realDir : path.join(currentCodeDirName, directory)
    return {
      dirname,
      deep: useSubdirectories,
      regexp,
      start,
      end,
      dynamicImport: mode !== 'sync',
    }
  })
}

export function findModuleHotSyntaxResult(babelResult: BabelFileResult) {
  const expressionResult = extractModuleHotExpression(babelResult) || []

  return expressionResult.map(er => {
    const { start, end } = er

    return {
      start,
      end,
    }
  })
}

function extractRequireContextExpression(babelResult: BabelFileResult) {
  let resList: Record<string, any>[] = []

  traverse(babelResult.ast, {
    CallExpression(path) {
      const node = path.node
      const { start, end } = node
      const calleeNode = path.get('callee').node as t.MemberExpression
      // @see https://github.com/smrq/babel-plugin-require-context-hook/blob/master/index.js
      if (
        t.isMemberExpression(path.node.callee, { computed: false }) &&
        t.isIdentifier(calleeNode.object, { name: 'require' }) &&
        t.isIdentifier(calleeNode.property, { name: 'context' })
      ) {
        const ret = [] as any[]
        node.arguments.map(item => {
          const type = item.type
          // @ts-expect-error
          const pattern = item.pattern
          // @ts-expect-error
          const value = type === 'RegExpLiteral' ? new RegExp(pattern) : item.value
          ret.push(value)
        })
        resList.push({
          start: start,
          end: end,
          args: ret,
        })
      }
    }, // /. CallExpression
  })

  return resList
}

function extractModuleHotExpression(babelResult: BabelFileResult) {
  let resList: { start: number; end: number }[] = []

  traverse(babelResult.ast, {
    Identifier(path) {
      const node = path.node
      if (t.isIdentifier(node, { name: 'module' })) {
        resList.push({
          start: node.start!,
          end: node.start!,
        })
      }
    },
  })

  return resList
}
