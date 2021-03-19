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
