test(123);  // reference:test

function test(bar) { // cursor:test declaration:test
  if (false) {
    test('baz'); // reference:test
  }
  return x + y
}
