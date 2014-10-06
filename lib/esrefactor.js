/*
  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*global esprima:true, estraverse:true, escope: true,
 define:true, require:true, exports:true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define('esrefactor', ['exports', 'esprima', 'estraverse', 'escope'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports, require('esprima'), require('estraverse'), require('escope'));
    } else {
        factory((root.esrefactor = {}), esprima, estraverse, escope);
    }
}(this, function (exports, esprima, estraverse, escope) {
    'use strict';

    function Context(code) {
        this._code = null;
        this._syntax = null;
        this._scopeManager = null;
        if (code) {
            this.setCode(code);
        }
    }

    Context.prototype.setCode = function(code) {
        this._code = code;
        this._syntax = esprima.parse(code, {range: true});
        this._scopeManager = escope.analyze(this._syntax);
    };

    function _locateDeclaration(ref) {
        var scope, i, v;

        if (ref.resolved) {
            return ref.resolved.defs[ref.resolved.defs.length - 1].name;
        }

        scope = ref.from;
        do {
            for (i = 0; i < scope.variables.length; ++i) {
                v = scope.variables[i];
                if (v.name === ref.identifier.name && v.defs.length) {
                    return v.defs[0].name;
                }
            }
            scope = scope.upper;
        } while (scope);

        return null;
    }

    // Given the scope, look up the reference which corresponds to the identifier
    // in the specified cursor position. If possible, find also the corresponding
    // declaration for that reference.

    function _findIdentifierInScope(scope, identifier) {
      var i, ref;

      if (scope.block.type === estraverse.Syntax.FunctionDeclaration) {
        if (scope.block.id === identifier) {
          return identifier;
        }
      }

      for (i = 0; i < scope.variableScope.variables.length; ++i) {
          ref = scope.variableScope.variables[i];
          for (var j = 0; j < ref.identifiers.length; ++j) {
              if (ref.identifiers[j] === identifier) {
                  return identifier;
              }
          }
      }
    }

    Context.prototype._lookupIdentifier = function (scope, identifier) {
        var i, ref;
        for (i = 0; i < scope.references.length; ++i) {
            ref = scope.references[i];
            if (ref.identifier === identifier) {
                return identifier;
            }
        }
        return _findIdentifierInScope(scope, identifier);
    };

    Context.prototype._lookupDeclaration = function(scope, identifier) {
      var i, ref;
      for (i = 0; i < scope.references.length; ++i) {
          ref = scope.references[i];
          if (ref.identifier === identifier) {
              return _locateDeclaration(ref);
          }
      }
      return _findIdentifierInScope(scope, identifier);
    };

    // Search for all other identical references (same scope).
    Context.prototype._findAllReferencesInScope = function(declaration, identifier) {
        var scopeManager = this._scopeManager;
        var lookupDeclaration = this._lookupDeclaration;
        var references = [];
        scopeManager.attach();
        estraverse.traverse(this._syntax, {
            enter: function (node) {
                var scope, i, ref;
                scope = scopeManager.acquire(node);
                for (i = 0; i < (scope ? scope.references.length : 0); ++i) {
                    ref = scope.references[i];
                    if (ref.identifier.name === identifier.name) {
                        if (lookupDeclaration(scope, ref.identifier) === declaration) {
                            references.push(ref.identifier);
                        }
                    }
                }
            }
        });
        scopeManager.detach();
        return references;
    };


    Context.prototype._getScopeByPosition = function(pos) {
        var scope;
        var scopeManager = this._scopeManager;
        scopeManager.attach();
        estraverse.traverse(this._syntax, {
            enter: function (node) {
              scope = scopeManager.acquire(node) || scope;
              if (node.type === esprima.Syntax.Identifier) {
                  if (node.range[0] <= pos && node.range[1] >= pos) {
                      return estraverse.VisitorOption.Break;
                  }
              }
            },
            leave: function (node) {
                scope = scopeManager.release(node) || scope;
            }
        });
        scopeManager.detach();
        return scope;
    };

    Context.prototype._getIdentifierNodeByPosition = function(pos) {
        var identifierNode;
        this._scopeManager.attach();
        estraverse.traverse(this._syntax, {
            enter: function (node) {
                if (node.type === esprima.Syntax.Identifier) {
                    if (node.range[0] <= pos && node.range[1] >= pos) {
                        identifierNode = node;
                        return estraverse.VisitorOption.Break;
                    }
                }
            }
        });
        this._scopeManager.detach();
        return identifierNode;
    };

    // Given the cursor position, locate the identifier in that position.
    // If there is no identifier in that position, undefined will be returned.
    //
    // The returned object will have the following property:
    //    identifier: the syntax node associated with the identifier
    //   declaration: the syntax node where the identifier is declared
    //    references: an array of the references of the identifier
    //
    // Note that the references array also includes the identifier but it
    // does exclude the declaration.
    //
    // Example:
    //     var ctx = new esrefactor.Context('var x; x; x = 42');
    //     var id = ctx.identify(10);
    //
    //  id will have the value of:
    //      {
    //        identifier: {
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [10, 11]
    //        },
    //        declaration: {
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [4, 5]
    //        },
    //        references: [{
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [7, 8]
    //        }, {
    //          type: 'Identifier',
    //          name: 'x',
    //          range: [10, 11]
    //        }]
    //      }

    Context.prototype.identify = function (pos) {
        if (!this._syntax) {
            throw new Error('Unable to identify anything without a syntax tree');
        }
        if (!this._scopeManager) {
            throw new Error('Unable to identify anything without a valid scope manager');
        }
        var identifier = this._getIdentifierNodeByPosition(pos);
        if (!identifier) {
            return;
        }

        var scope = this._getScopeByPosition(pos);
        var declaration = this._lookupDeclaration(scope, identifier);
        return {
            identifier: this._lookupIdentifier(scope, identifier),
            declaration: declaration,
            references: this._findAllReferencesInScope(declaration, identifier)
        };
    };

    // Rename the identifier and its reference to a new specific name.
    // The return value is the new code after the identifier is renamed.
    //
    // This functions needs identification, which is obtain using identify() function.
    //
    // Example:
    //   var ctx = new esrefactor.Context('var x; x = 42');
    //   var id = ctx.identify(4);
    //   var code = ctx.rename(id, 'y');
    //
    // code will be `var y; y = 42'.

    Context.prototype.rename = function (identification, name) {
        var result, list, set, i, id, entry;

        if (!this._code) {
            throw new Error('Unable to rename without the original source');
        }

        result = this._code;
        if (typeof identification === 'undefined') {
            return result;
        }

        list = [identification.identifier.range];
        if (identification.declaration) {
            list.push(identification.declaration.range);
        }
        for (i = 0; i < identification.references.length; ++i) {
            list.push(identification.references[i].range);
        }

        // Sort the references based on the position to prevent
        // shifting all the ranges.
        list.sort(function (a, b) { return b[0] - a[0]; });

        // Prevent double renaming, get the unique set.
        set = [];
        set.push(list[0]);
        for (i = 1; i < list.length; ++i) {
            if (list[i][0] !== list[i - 1][0]) {
                set.push(list[i]);
            }
        }

        id = identification.identifier.name;
        for (i = 0; i < set.length; ++i) {
            result = result.slice(0, set[i][0]) + name + result.slice(set[i][1]);
        }

        return result;
    };

    exports.Context = Context;
}));
