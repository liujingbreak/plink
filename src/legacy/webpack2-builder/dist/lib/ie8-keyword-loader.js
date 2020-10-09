"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2xlZ2FjeS93ZWJwYWNrMi1idWlsZGVyL3RzL2xpYi9pZTgta2V5d29yZC1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBQzVCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsRCxJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDeEUsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzFDLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFcEMsTUFBTSxRQUFRLEdBQTJCLEVBQUUsQ0FBQztBQUU1QyxJQUFJLFdBQVcsR0FBYSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNO0lBQ3BHLFNBQVMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxRQUFRO0lBQ3ZFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTTtJQUMxRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVO0lBQ25FLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU07SUFDL0QsWUFBWSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxF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QUM7SUFDL0MsSUFBSSxVQUFVLElBQUksSUFBSSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0tBQ2xEO0lBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7QUFDekMsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxZQUEyQjtJQUM1RCxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFFLENBQUM7UUFDN0IsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDZixPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBUyxJQUFJLEVBQUUsTUFBTTtRQUM5QyxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNsQyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQztRQUM5QixJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQ3JDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMvQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlELENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNYLENBQUMiLCJmaWxlIjoibGVnYWN5L3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9saWIvaWU4LWtleXdvcmQtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
