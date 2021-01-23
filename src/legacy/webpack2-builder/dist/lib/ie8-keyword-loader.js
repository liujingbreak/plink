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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWU4LWtleXdvcmQtbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaWU4LWtleXdvcmQtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEQsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hFLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUMxQyxRQUFRLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRXBDLE1BQU0sUUFBUSxHQUEyQixFQUFFLENBQUM7QUFFNUMsSUFBSSxXQUFXLEdBQWEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTTtJQUNwRyxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsUUFBUTtJQUN2RSxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU07SUFDMUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVTtJQUNuRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNO0lBQy9ELFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxN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Qy9DLElBQUksVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1FBQzdDLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUNsRDtJQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsWUFBMkI7SUFDNUQsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFDLFVBQVMsSUFBSSxFQUFFLE1BQU07UUFDOUMsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7UUFDbEMsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUM7UUFDOUIsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUNyQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDL0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5RCxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDWCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xudmFyIGFjb3JuID0gcmVxdWlyZSgnYWNvcm4nKTtcbnZhciBhY29ybmpzeCA9IHJlcXVpcmUoJ2Fjb3JuLWpzeC9pbmplY3QnKShhY29ybik7XG52YXIgYWNvcm5JbXBJbmplY3QgPSByZXF1aXJlKCdhY29ybi1keW5hbWljLWltcG9ydC9saWIvaW5qZWN0JykuZGVmYXVsdDtcbnZhciBlc3RyYXZlcnNlID0gcmVxdWlyZSgnZXN0cmF2ZXJzZS1mYicpO1xuYWNvcm5qc3ggPSBhY29ybkltcEluamVjdChhY29ybmpzeCk7XG5cbmNvbnN0IGtleXdvcmRzOiB7W2s6IHN0cmluZ106IGJvb2xlYW59ID0ge307XG5cbnZhciBrZXl3b3JkTGlzdDogc3RyaW5nW10gPSBbJ2JyZWFrJywgJ2Nhc2UnLCAnY2F0Y2gnLCAnY29udGludWUnLCAnZGVmYXVsdCcsICdkZWxldGUnLCAnZG8nLCAnZWxzZScsXG4nZmluYWxseScsICdmb3InLCAnZnVuY3Rpb24nLCAnaWYnLCAnaW4nLCAnaW5zdGFuY2VvZicsICduZXcnLCAncmV0dXJuJyxcbidzd2l0Y2gnLCAndGhpcycsICd0aHJvdycsICd0cnknLCAndHlwZW9mJywgJ3ZhcicsICd2b2lkJywgJ3doaWxlJywgJ3dpdGgnLFxuJ2Fic3RyYWN0JywgJ2Jvb2xlYW4nLCAnYnl0ZScsICdjaGFyJywgJ2NsYXNzJywgJ2NvbnN0JywgJ2RlYnVnZ2VyJyxcbidkb3VibGUnLCAnZW51bScsICdleHBvcnQnLCAnZXh0ZW5kcycsICdmaW5hbCcsICdmbG9hdCcsICdnb3RvJyxcbidpbXBsZW1lbnRzJywgJ2ltcG9ydCcsICdpbnQnLCAnaW50ZXJmYWNlJywgJ2xvbmcnLCAnbmF0aXZlJywgJ3BhY2thZ2UnLFxuJ3ByaXZhdGUnLCAncHJvdGVjdGVkJywgJ3B1YmxpYycsICdzaG9ydCcsICdzdGF0aWMnLCAnc3VwZXInLFxuJ3N5bmNocm9uaXplZCcsICd0aHJvd3MnLCAndHJhbnNpZW50JywgJ3ZvbGF0aWxlJywgJ251bGwnXTtcblxua2V5d29yZExpc3QuZm9yRWFjaCgod29yZDogc3RyaW5nKSA9PiBrZXl3b3Jkc1t3b3JkXSA9IHRydWUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZywgbWFwOiBhbnksIGFzdDoge3JlcGxhY2VtZW50czogUmVwbGFjZW1lbnRbXSwgW2s6IHN0cmluZ106IGFueX0pIHtcbiAgdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuICBpZiAoIWNhbGxiYWNrKVxuICAgIHRocm93IG5ldyBFcnJvcignYXBpLWxvYWRlciBpcyBOb3QgYSBzeW5jIGxvYWRlciEnKTtcbiAgbG9hZEFzeW5jKGNvbnRlbnQsIHRoaXMsIGFzdClcbiAgLnRoZW4oKHtjb250ZW50LCBhc3R9KSA9PiBjYWxsYmFjayhudWxsLCBjb250ZW50LCBtYXAsIGFzdCkpXG4gIC5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgIHRoaXMuZW1pdEVycm9yKGVycik7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgfSk7XG59O1xuXG5pbnRlcmZhY2UgUmVwbGFjZW1lbnQge1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbiAgcmVwbGFjZW1lbnQ6IHN0cmluZztcbn1cblxuZnVuY3Rpb24gbG9hZEFzeW5jKGNvbnRlbnQ6IHN0cmluZywgbG9hZGVyOiBhbnksIGFzdDogYW55KTogUHJvbWlzZTx7Y29udGVudDogc3RyaW5nLCBhc3Q6IGFueX0+IHtcbiAgLy8gaWYgKCFhc3QpIHtcbiAgdHJ5IHtcbiAgICBhc3QgPSBhY29ybmpzeC5wYXJzZShjb250ZW50LCB7YWxsb3dIYXNoQmFuZzogdHJ1ZSwgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX0sXG4gICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJ30pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhc3QgPSBhY29ybmpzeC5wYXJzZShjb250ZW50LCB7YWxsb3dIYXNoQmFuZzogdHJ1ZSwgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX19KTtcbiAgfVxuICAvLyB9XG4gIGlmICghYXN0LnJlcGxhY2VtZW50cylcbiAgICBhc3QucmVwbGFjZW1lbnRzID0gW107XG4gIGVzdHJhdmVyc2UudHJhdmVyc2UoYXN0LCB7XG4gICAgZW50ZXIobm9kZTogYW55LCBwYXJlbnQ6IGFueSkge1xuICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ01lbWJlckV4cHJlc3Npb24nICYmIF8uZ2V0KG5vZGUsICdwcm9wZXJ0eS50eXBlJykgPT09ICdJZGVudGlmaWVyJyAmJlxuICAgICAgICBfLmhhcyhrZXl3b3Jkcywgbm9kZS5wcm9wZXJ0eS5uYW1lKSkge1xuICAgICAgICBhc3QucmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBub2RlLnByb3BlcnR5LnN0YXJ0IC0gMSwgLy8gLmRlZmF1bHQgLT4gW1wiZGVmYXVsdFwiXVxuICAgICAgICAgIGVuZDogbm9kZS5wcm9wZXJ0eS5lbmQsXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6IGBbXCIke25vZGUucHJvcGVydHkubmFtZX1cIl1gXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGVhdmUobm9kZTogYW55LCBwYXJlbnQ6IGFueSkge1xuICAgIH0sXG4gICAga2V5czoge1xuICAgICAgSW1wb3J0OiBbXSwgSlNYVGV4dDogW11cbiAgICB9XG4gIH0pO1xuICB2YXIgb3B0UmVwbGFjZTogYm9vbGVhbiA9IGxvYWRlci5xdWVyeS5yZXBsYWNlO1xuICBpZiAob3B0UmVwbGFjZSA9PSBudWxsIHx8IG9wdFJlcGxhY2UgPT09IHRydWUpIHtcbiAgICBjb250ZW50ID0gcmVwbGFjZUNvZGUoY29udGVudCwgYXN0LnJlcGxhY2VtZW50cyk7XG4gIH1cbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7Y29udGVudCwgYXN0fSk7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VDb2RlKHRleHQ6IHN0cmluZywgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudFtdKSB7XG4gIHJlcGxhY2VtZW50cy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYS5zdGFydCAtIGIuc3RhcnQ7XG4gIH0pO1xuICB2YXIgb2Zmc2V0ID0gMDtcbiAgcmV0dXJuIHJlcGxhY2VtZW50cy5yZWR1Y2UoZnVuY3Rpb24odGV4dCwgdXBkYXRlKSB7XG4gICAgdmFyIHN0YXJ0ID0gdXBkYXRlLnN0YXJ0ICsgb2Zmc2V0O1xuICAgIHZhciBlbmQgPSB1cGRhdGUuZW5kICsgb2Zmc2V0O1xuICAgIHZhciByZXBsYWNlbWVudCA9IHVwZGF0ZS5yZXBsYWNlbWVudDtcbiAgICBvZmZzZXQgKz0gKHJlcGxhY2VtZW50Lmxlbmd0aCAtIChlbmQgLSBzdGFydCkpO1xuICAgIHJldHVybiB0ZXh0LnNsaWNlKDAsIHN0YXJ0KSArIHJlcGxhY2VtZW50ICsgdGV4dC5zbGljZShlbmQpO1xuICB9LCB0ZXh0KTtcbn1cbiJdfQ==