/** Must split css scope logic into this seperate file from api.js, since this part does not require lodash, but api.js
 * needs lodash.
 */

// ---- css scope -----------------

var classAddedSet;
var htmlDom;
var has = Object.prototype.hasOwnProperty;

exports.writeCssClassToHtml = function(classnames) {
	if (!classAddedSet)
		classAddedSet = getHtmlClassSet();
	for (var i = 0, l = classnames.length; i < l; i++) {
		var cls = classnames[i];
		if (!has.call(classAddedSet, cls)) {
			htmlDom.className += ' ' + cls;
			classAddedSet[cls] = true;
		}
	}
};

function getHtmlClassSet() {
	var classSet = {};
	htmlDom = document.getElementsByTagName('html')[0];
	var classes = htmlDom.className.split(' ');
	for (var i = 0, l = classes.length; i < l; i++) {
		if (classes[i].length > 0)
			classSet[classes[i]] = true;
	}
	return classSet;
}
