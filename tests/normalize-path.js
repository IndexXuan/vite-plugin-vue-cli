const { normalizePath } = require('vite')

console.log(
  'full path: ',
  '/Users/indexxuan/github/vue-enterprise-boilerplate/src/components/_base-button.unit.js',
)
console.log('relative path: ', './_base-button.unit.js')
console.log('final path: ', normalizePath('./_base-button.unit.js'))
