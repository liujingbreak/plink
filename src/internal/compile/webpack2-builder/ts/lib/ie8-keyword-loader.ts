import * as _ from 'lodash';
var acorn = require('acorn');
var acornjsx = require('acorn-jsx/inject')(acorn);
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
var estraverse = require('estraverse-fb');
acornjsx = acornImpInject(acornjsx);

const keywords: {[k: string]: boolean} = {};

var keywordList: string[] = ['break', 'case', 'catch', 'continue', 'default', 'delete', 'do', 'else',
'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
'abstract', 'boolean', 'byte', 'char', 'class', 'const', 'debugger',
'double', 'enum', 'export', 'extends', 'final', 'float', 'goto',
'implements', 'import', 'int', 'interface', 'long', 'native', 'package',
'private', 'protected', 'public', 'short', 'static', 'super',
'synchronized', 'throws', 'transient', 'volatile', 'null'];

keywordList.forEach((word: string) => keywords[word] = true);

module.exports = function(content: string, map: any, ast: {replacements: Replacement[], [k: string]: any}) {
	var callback = this.async();
	if (!callback)
		throw new Error('api-loader is Not a sync loader!');
	loadAsync(content, this, ast)
	.then(({content, ast}) => callback(null, content, map, ast))
	.catch((err: Error) => {
		this.emitError(err);
		callback(err);
	});
};

interface Replacement {
	start: number;
	end: number;
	replacement: string;
}

function loadAsync(content: string, loader: any, ast: any): Promise<{content: string, ast: any}> {
	// if (!ast) {
	try {
		ast = acornjsx.parse(content, {allowHashBang: true, plugins: {jsx: true, dynamicImport: true},
			sourceType: 'module'});
	} catch (err) {
		ast = acornjsx.parse(content, {allowHashBang: true, plugins: {jsx: true, dynamicImport: true}});
	}
	// }
	if (!ast.replacements)
		ast.replacements = [];
	estraverse.traverse(ast, {
		enter(node: any, parent: any) {
			if (node.type === 'MemberExpression' && _.get(node, 'property.type') === 'Identifier' &&
				_.has(keywords, node.property.name)) {
				ast.replacements.push({
					start: node.property.start - 1, // .default -> ["default"]
					end: node.property.end,
					replacement: `["${node.property.name}"]`
				});
			}
		},
		leave(node: any, parent: any) {
		},
		keys: {
			Import: [], JSXText: []
		}
	});
	var optReplace: boolean = loader.query.replace;
	if (optReplace == null || optReplace === true) {
		content = replaceCode(content, ast.replacements);
	}
	return Promise.resolve({content, ast});
}

function replaceCode(text: string, replacements: Replacement[]) {
	replacements.sort(function(a, b) {
		return a.start - b.start;
	});
	var offset = 0;
	return replacements.reduce(function(text, update) {
		var start = update.start + offset;
		var end = update.end + offset;
		var replacement = update.replacement;
		offset += (replacement.length - (end - start));
		return text.slice(0, start) + replacement + text.slice(end);
	}, text);
}
