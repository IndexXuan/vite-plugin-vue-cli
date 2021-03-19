//based on http://stackoverflow.com/questions/9210542/node-js-require-cache-possible-to-invalidate

const { clearRequireCache } = require('../../src/lib/utils')

console.log(`code: 
-----------------------------------------------------------------------
const { counter } = process.env

module.exports = {
  counter: Number(counter),
  newCounter: {
    value: Number(process.env.counter),
  },
  fn() {
    console.log('process.env.counter: ', Number(process.env.counter))
    console.log('cached counter: ', Number(counter))
  },
}
`)

console.log('if process.env.counter is not defined\n')
var myModule1 = require('./my-module')
console.log('myModule1.counter', myModule1.counter) // NaN
console.log('myModule1.newCounter', myModule1.newCounter) // NaN
myModule1.fn() // console.log NaN NaN

process.env.counter = 0
console.log('\n')
console.log('then set process.env.counter = 0')

var myModule1 = require('./my-module')
console.log('myModule1.counter', myModule1.counter) // NaN
console.log('myModule1.newCounter', myModule1.newCounter) // NaN
myModule1.fn() // console.log 0 NaN

console.log('\n')
console.log('clear require cache')
console.log(`code:
----------------------------------------------------------------------
function clearRequireCache() {
  Object.keys(require.cache).forEach(function (key) {
    delete require.cache[key]
  })
}
clearRequireCache()
`)
clearRequireCache()

var myModule1 = require('./my-module')
console.log('myModule1.counter', myModule1.counter) // 0
console.log('myModule1.newCounter', myModule1.newCounter) // 0
myModule1.fn() // console.log 0 0
