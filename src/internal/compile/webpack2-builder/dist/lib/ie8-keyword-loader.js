"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
var acorn = require('acorn');
var acornjsx = require('acorn-jsx/inject')(acorn);
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
var estraverse = require('estraverse-fb');
acornjsx = acornImpInject(acornjsx);
const keywords = {};
var keywordList = ['break', 'case', 'catch', 'continue', 'default', 'delete', 'do', 'else',
    'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
    'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
    'abstract', 'boolean', 'byte', 'char', 'class', 'const', 'debugger',
    'double', 'enum', 'export', 'extends', 'final', 'float', 'goto',
    'implements', 'import', 'int', 'interface', 'long', 'native', 'package',
    'private', 'protected', 'public', 'short', 'static', 'super',
    'synchronized', 'throws', 'transient', 'volatile', 'null'];
keywordList.forEach((word) => keywords[word] = true);
module.exports = function (content, map, ast) {
    var callback = this.async();
    if (!callback)
        throw new Error('api-loader is Not a sync loader!');
    loadAsync(content, this, ast)
        .then(({ content, ast }) => callback(null, content, map, ast))
        .catch((err) => {
        this.emitError(err);
        callback(err);
    });
};
function loadAsync(content, loader, ast) {
    // if (!ast) {
    try {
        ast = acornjsx.parse(content, { allowHashBang: true, plugins: { jsx: true, dynamicImport: true },
            sourceType: 'module' });
    }
    catch (err) {
        ast = acornjsx.parse(content, { allowHashBang: true, plugins: { jsx: true, dynamicImport: true } });
    }
    // }
    if (!ast.replacements)
        ast.replacements = [];
    estraverse.traverse(ast, {
        enter(node, parent) {
            if (node.type === 'MemberExpression' && _.get(node, 'property.type') === 'Identifier' &&
                _.has(keywords, node.property.name)) {
                ast.replacements.push({
                    start: node.property.start - 1,
                    end: node.property.end,
                    replacement: `["${node.property.name}"]`
                });
            }
        },
        leave(node, parent) {
        },
        keys: {
            Import: [], JSXText: []
        }
    });
    var optReplace = loader.query.replace;
    if (optReplace == null || optReplace === true) {
        content = replaceCode(content, ast.replacements);
    }
    return Promise.resolve({ content, ast });
}
function replaceCode(text, replacements) {
    replacements.sort(function (a, b) {
        return a.start - b.start;
    });
    var offset = 0;
    return replacements.reduce(function (text, update) {
        var start = update.start + offset;
        var end = update.end + offset;
        var replacement = update.replacement;
        offset += (replacement.length - (end - start));
        return text.slice(0, start) + replacement + text.slice(end);
    }, text);
}

//# sourceMappingURL=ie8-keyword-loader.js.map
