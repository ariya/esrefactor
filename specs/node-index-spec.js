var Context = require('../lib/esrefactor').Context;

describe('node index', function() {
  describe('should should equal for same source but different names', function() {
    describe('for variables', function() {
      it('with same name length', function() {
        var nodeIndexOfFoo = new Context('var foo').identify(4).identifier.nodeIndex;
        var nodeIndexOfBar = new Context('var bar').identify(4).identifier.nodeIndex;
        expect(nodeIndexOfFoo).toBe(nodeIndexOfBar);
      });
      it('with different name length', function() {
        var nodeIndex1 = new Context('var foo').identify(4).identifier.nodeIndex;
        var nodeIndex2 = new Context('var $').identify(4).identifier.nodeIndex;
        expect(nodeIndex1).toBe(nodeIndex2);
      });
    });

    describe('for functions', function() {
      it('with same name.length', function() {
        var nodeIndexOfFoo = new Context('function foo(){}').identify(9).identifier.nodeIndex;
        var nodeIndexOfBar = new Context('function bar(){}').identify(9).identifier.nodeIndex;
        expect(nodeIndexOfFoo).toBe(nodeIndexOfBar);
      });
      it('with different name.length', function() {
        var nodeIndex1 = new Context('function func(){}; func()').identify(9).identifier.nodeIndex;
        var nodeIndex2 = new Context('function bar(){}; bar()').identify(9).identifier.nodeIndex;
        expect(nodeIndex1).toBe(nodeIndex2);
      });
    });
  });
});
