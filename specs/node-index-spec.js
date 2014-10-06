var Context = require('../lib/esrefactor').Context;

describe('node index', function() {
  describe('should should equal for same source but different names', function() {
    describe('for variables', function() {
      it('with same name length', function() {
        var nodePathOfFoo = new Context('var foo').identify(4).identifier.nodeIndex;
        var nodePathOfBar = new Context('var bar').identify(4).identifier.nodeIndex;
        expect(nodePathOfFoo).toBe(nodePathOfBar);
      });
      it('with different name length', function() {
        var nodePath1 = new Context('var foo').identify(4).identifier.nodeIndex;
        var nodePath2 = new Context('var $').identify(4).identifier.nodeIndex;
        expect(nodePath1).toBe(nodePath2);
      });
    });

    describe('for functions', function() {
      it('with same name.length', function() {
        var nodePathOfFoo = new Context('function foo(){}').identify(9).identifier.nodeIndex;
        var nodePathOfBar = new Context('function bar(){}').identify(9).identifier.nodeIndex;
        expect(nodePathOfFoo).toBe(nodePathOfBar);
      });
      it('with different name.length', function() {
        var nodePath1 = new Context('function func(){}; func()').identify(9).identifier.nodeIndex;
        var nodePath2 = new Context('function bar(){}; bar()').identify(9).identifier.nodeIndex;
        expect(nodePath1).toBe(nodePath2);
      });
    });
  });
});
