var acorn = require('acorn');
//const log = require('log4js').getLogger('wfh.es-parser');
var acornjsx = require('acorn-jsx/inject')(acorn);
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
var _ = require('lodash');
var estraverse = require('estraverse-fb');
acornjsx = acornImpInject(acornjsx);
var jsxAssets = require('./jsx-assets').replaceAssetsAsync;

exports.parseAsync = parseAsync;

var EMTPY_FUNC = function() {};
var STYLE_FILE_REG = /^.*?\.(less|scss|css)$/i;
/**
 * [parse description]
 * @param  {string} text    [description]
 * @param  {object} handler {
 * @param  {function} handler.splitLoad(packageName)
 * @param  {function} handler.apiIndentity(astNode)
 * @param  ast: AST, if not null, it will skip acorn parsing
 */
function parseAsync(text, handler, ast) {
	if (!ast) {
		try {
			ast = acornjsx.parse(text, {allowHashBang: true, plugins: {jsx: true, dynamicImport: true}, sourceType: 'module'});
		} catch (err) {
			ast = acornjsx.parse(text, {allowHashBang: true, plugins: {jsx: true, dynamicImport: true}});
		}
	}
	if (!ast.replacements)
		ast.replacements = [];
	if (!handler.dependsStyle)
		handler.dependsStyle = EMTPY_FUNC;
	//console.log('\n---------\n%s', JSON.stringify(ast, null, '  '));
	var proms = [];
	estraverse.traverse(ast, {
		enter(node, parent) {
			if (onIdentity('__api', node, parent)) {
				handler.apiIndentity(node);
			} else if (node.type === 'CallExpression') {
				var calleeType = _.get(node, 'callee.type');
				var callee = node.callee;
				if (handler.requireApi && (calleeType === 'Identifier' || calleeType === 'Import') && node.callee.name === 'require') {
					let callee = _.get(node, 'arguments[0].value');
					if (callee === '__api') {
						handler.requireApi();
					} else if (STYLE_FILE_REG.test(callee)) {
						handler.dependsStyle(callee);
					}
				} else if (node.callee && calleeType === 'MemberExpression') {
					if (callee.object.name === 'require' && callee.object.type === 'Identifier' &&
						callee.property.name === 'ensure' && callee.property.type === 'Identifier') {
						var args = node.arguments;
						if (args.length < 2) {
							throw new Error('require.ensure() must be called with 2' +
							'paramters (Array packageNames, Function callback)');
						}
						if (args[0].type === 'ArrayExpression') {
							args[0].elements.forEach(nameNode => {
								if (nameNode.type !== 'Literal') {
									throw new Error('require.ensure() must be called with String literal');
								}
								handler.splitLoad(nameNode.value);
							});
						} else if (args[0].type === 'Literal') {
							handler.splitLoad(args[0].value);
						}
					} else if (callee.object.name === 'React' && callee.object.type === 'Identifier' &&
						callee.property.name === 'createElement' && callee.property.type === 'Identifier') {
						proms.push(jsxAssets(node, ast.replacements));
					}
				}
			} else if (node.type === 'ImportDeclaration') {
				let callee = node.source.value;
				if (callee === '__api')
					handler.es6ImportApi(node);
				else if (STYLE_FILE_REG.test(callee))
					handler.dependsStyle(callee);
			}
			//parser.handleAstEnter(node, parent);
		},

		leave(node, parent) {
			//parser.handleAstLeave(node, parent);
		},
		keys: {
			Import: [], JSXText: []
		}
	});
	return Promise.all(proms).then(() => ast);
}

exports.onIdentity = onIdentity;
function onIdentity(name, node, parent) {
	return (node.type === 'Identifier' && node.name === name && !(parent.type === 'MemberExpression' && parent.property === node));
}

var patchText = require('./patch-text');
exports.replaceRequireKeyword = function(code, replacement) {
	var ast = acorn.parse(code);
	var patches = [];
	estraverse.traverse(ast, {
		enter(node, parent) {
			if (node.type === 'Identifier' && node.name === 'require' &&
				(parent.type !== 'MemberExpression' || parent.object === node || parent.computed) &&
				(parent.type !== 'Property' || parent.key !== node)) {
				patches.push({
					start: node.start,
					end: node.end,
					replacement
				});
			}
		}
	});
	return patchText(code, patches);
};
