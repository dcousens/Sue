var test = require('tape')
var qup = require('../')

test('runs, with N concurrent', (t) => {
  t.plan(12)

  var accum = 0

  function add (x, callback) {
    accum += x
    setTimeout(callback)
  }

  var su = qup(add, 2)

  su.push(2)
  t.equal(accum, 2) // 2 was added
  t.equal(su.running, 1) // add is now waiting on setTimeout
  t.equal(su.q.length, 0) // nothing is left in the queue

  su.push(3)
  t.equal(accum, 5) // 3 was added
  t.equal(su.running, 2) // two add's are now waiting on setTimeout
  t.equal(su.q.length, 0) // still, nothing is left in the queue

  su.push(60, () => {
    t.equal(accum, 65) // 60 was added
    t.equal(su.running, 0) // nothing is running during a callback
    t.equal(su.q.length, 0) // nothing is left in the queue
  })

  t.equal(accum, 5) // nothing was added
  t.equal(su.running, 2) // two add's are still waiting on setTimeout
  t.equal(su.q.length, 1) // 60 is now in the queue
})

test('README example as expected', (t) => {
  t.plan(8)

  let expected = [1, 2, 3, 4, 5, 6, 7, 8]
  let q = qup((batch, callback) => {
    t.same(batch, expected[0])
    expected.shift()

    // => in order, [1, 2, 3, 4, 5, 6, 7, 8]
    setTimeout(callback)
  }, 3)

  q.push(1)
  q.push(2)
  q.push(3)
  q.push(4)
  q.push(5)
  q.push(6)
  q.push(7)
  q.push(8)
})

test('push, with return value expected (non-batch only)', (t) => {
  var a = 9
  var su = qup((x, callback) => {
    callback(null, a + x)
  })

  t.plan(2)
  su.push(6, (err, y) => {
    t.ifErr(err)
    t.equal(y, 15)
  })
})

test('doesn\'t blow the stack', (t) => {
  let q = qup((x, callback) => {
    if (x === 0) return setTimeout(callback)
    if (x === 1e5 - 1) t.end()

    callback()
  }, 1)

  q.push(0)
  for (var i = 1; i < 1e5; ++i) q.push(i)
})

test('clear works as expected', (t) => {
  t.plan(6)
  let expected = [1, 4, 5]

  let q = qup((x, callback) => {
    t.equal(x, expected[0])
    expected.shift()

    setTimeout(callback)
  }, 1)

  q.push(1)
  q.push(2)
  q.push(3)

  t.equal(q.q.length, 2)
  q.clear()
  t.equal(q.q.length, 0)

  q.push(4)
  q.push(5)
  t.equal(q.q.length, 2)
})

test('kill clears and stops callbacks', (t) => {
  t.plan(3)

  let q = qup((x, callback) => {
    // test 2
    t.ok(true)

    setTimeout(callback)
  }, 1)

  q.push(1, () => {
    // clears the queue and ceases any callbacks
    q.kill()

    // test 3
    t.equal(q.q.length, 0)
  })

  // pushes ignored after kill
  q.push(2)
  q.push(3)
  q.push(4)

  // test 1
  t.equal(q.q.length, 3)
})
