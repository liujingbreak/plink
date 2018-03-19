const api = require('__api');
const log = require('log4js').getLogger('wfh.css-scope-loader');
const _ = require('lodash');
// const fs = require('fs');
// const Path = require('path');
const postcss = require('postcss'); // read http://api.postcss.org/postcss.html
const selectorToken = require('css-selector-tokenizer');

api.compsHaveCssSet = {};

module.exports = function(content) {
	var callback = this.async();
	if (!callback)
		return load(content, this);
	loadAsync(content, this)
	.then(result => callback(null, result))
	.catch(err => callback(err));
};

function load(content, loader) {
	return parse(content, loader);
}

function loadAsync(content, loader) {
	try {
		return Promise.resolve(load(content, loader));
	} catch (e) {
		log.error(e);
		loader.emitError(e);
		return Promise.reject(e);
	}
}

function parse(content, loader) {
	var file = loader.resourcePath;
	var currPackage = api.findPackageByFile(file);

	if (!currPackage || !currPackage.dr)
		return content;
	// api.compsHaveCssSet[currPackage.longName] = true;
	// if (currPackage.dr.cssScope === false)
	// 	return content;
	var cssAst = postcss.parse(content);
	traverseRuleNodes(cssAst.nodes, currPackage, file);
	return cssAst.toResult().css;
}

function traverseRuleNodes(nodes, currPackage, file) {
	var selector = null;
	var cls = currPackage.dr.cssScope;
	if (!_.isString(cls))
		cls = currPackage.shortName;
	cls = cls.replace('.', '_');
	_.each(nodes, node => {
		if (node.type === 'atrule' && node.name === 'media') {
			traverseRuleNodes(node.nodes, currPackage, file);
		}
		if (node.type !== 'rule' || !node.selector)
			return;
		selector = node.selector;
		var selectorAst = selectorToken.parse(node.selector);
		_.each(selectorAst.nodes, forEachSelectorNode);
		node.selector = selectorToken.stringify(selectorAst);
	});

	function forEachSelectorNode(selectorNode) {
		var i = indexOfSelAstNodeBeforeOperator(selectorNode.nodes, 'element', 'name', 'html', true);
		if (i >= 0) {
			log.debug('Found HTML level css selector: %s in %s', selector, file);
			selectorNode.nodes.splice(i + 1, 0, {
				type: 'class', name: cls
			});
		} else {
			var firstType = _.get(selectorNode, 'nodes[0].type');
			if (firstType.indexOf('pseudo-class') >= 0 && selectorNode.nodes[0].name === 'global') {
				log.info('Skip :global css selector: %s in %s', selector, file);
				return;
			}
			if (firstType === 'class' && selectorNode.nodes[0].name === cls) {
				log.debug('Skip duplicate package short name css selector: %s in %s', selector, file);
				return;
			}
			selectorNode.nodes.unshift({
				type: 'class', name: cls
			},
			{type: 'spacing', value: ' '}
			);
		}
	}
}

function indexOfSelAstNodeBeforeOperator(selectorNodes, type, key, value, ignoreCase) {
	var found = -1;
	var i = 0;
	_.some(selectorNodes, n => {
		if (n.type === 'operator')
			return true;
		if (n.type === type && (ignoreCase ? n[key].toLowerCase() : n[key]) === (ignoreCase ? value.toLowerCase() : value)) {
			found = i;
			return true;
		}
		i++;
		return false;
	});
	return found;
}
