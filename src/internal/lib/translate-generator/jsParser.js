var acorn = require('acorn');
var acornjsx = require('acorn-jsx/inject')(acorn);
var estraverse = require('estraverse-fb');
var log = require('log4js').getLogger('translate-generator.jsParser');
var _ = require('lodash');
var api = require('__api');
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;

acornjsx = acornImpInject(acornjsx);
var matchFuncNames = [];
var configNames = api.config.get(api.packageName + '.scanMethodNames');
if (configNames) {
	[].push.apply(matchFuncNames, [].concat(configNames));
}

module.exports = function(fileContent, onCallExpNode, filePath, ast) {
	if (!ast) {
		log.debug('parsing ' + filePath);
		try {
			ast = acornjsx.parse(fileContent, {locations: true, allowHashBang: true, sourceType: 'module',
				plugins: {jsx: true, dynamicImport: true}});
		} catch (err) {
			ast = acornjsx.parse(fileContent, {locations: true, allowHashBang: true,
				plugins: {jsx: true, dynamicImport: true}
			});
		}
	}

	var matchAsts = matchFuncNames.map(name => {
		return acorn.parse(name).body[0].expression;
	});

	estraverse.traverse(ast, {
		enter(node, parent) {
			if (node.type === 'CallExpression') {
				matchAsts.some(matchAst => {
					if (isSameAst(matchAst, node.callee)) {
						if (!node.arguments || node.arguments.length === 0) {
							log.warn('%s\nShould call with at least 1 parameter, ' + 'line ' + node.loc.start.line +
							':\n' + fileContent.substring(node.start, node.end), filePath);
							return true;
						}
						var keyParam = node.arguments[0];
						if (keyParam.type !== 'Literal') {
							log.warn('%s\nShould be String literal param type, ' + 'line ' + keyParam.loc.start.line +
								':\n' + fileContent.substring(node.start, node.end), filePath);
							return true;
						}
						log.debug('found key in JS: ' + node.arguments[0].value);
						onCallExpNode(node.arguments[0].value, node);
						return true;
					}
					return false;
				});
			}
		},
		keys: {
			Import: [], JSXText: []
		}
	});
	return ast;
};

var compareIngoreProperty = {loc: true, start: true, end: true};

module.exports.isSameAst = isSameAst;
/**
 * Deep comparison
 * @return true if node2 has all the properties and their values same as node1 has
 */
function isSameAst(node1, node2) {
	return _.every(node1, (value, key) => {
		if (_.has(compareIngoreProperty, key))
			return true;
		if (!_.has(node2, key)) {
			return false;
		}
		if (_.isObject(value)) {
			return isSameAst(value, node2[key]);
		} else if (_.isArray(value)) {
			return _.isArray(node2[key]) && _.difference(value, node2[key]).length === 0;
		} else if (value !== node2[key]) {
			return false;
		}
		return true;
	});
}
module.exports.searchFunctionInTS = searchFunctionInTS;

function searchFunctionInTS(fileContent, onCall) {
	var i = 0;
	var lex = [
		// {reg: /([\w$]+)\s*\(\s*([^)]+?)\s*\)(?!\s*\{)/mg, action: match => {
		// 	matchFuncNames.some(funcName => {
		// 		if (match[1] === funcName && match[2])
		// 			onCall(_.trim(match[2], '\'"'));
		// 	});
		// }}
	];
	matchFuncNames.map(funcName => {
		lex.push({
			reg: new RegExp('(?:^|\\W|$)' + funcName + '\\s*\\(\\s*([^)]+?)\\s*\\)(?!\\s*[{:])', 'mg'),
			action: match => onCall(_.trim(match[1], '\'"'))
		});
	});

	while (i < fileContent.length) {
		var matchAny = lex.some(isMatch);
		if (!matchAny)
			break;
	}
	function isMatch(rule) {
		if (rule.reg) {
			rule.reg.lastIndex = i;
			var m = rule.reg.exec(fileContent);
			if (m) {
				i = rule.reg.lastIndex;
				var r = rule.action(m);
				if (r === undefined || r === true)
					return true;
			}
		}
		return false;
	}
}
