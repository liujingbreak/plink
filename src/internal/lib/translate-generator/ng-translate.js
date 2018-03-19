/**
 * @Deprecated
 * @type {[type]}
 */
var api = require('__api');

var m = angular.module('drTranslate', []);
m.directive('t', [translateFactory]);
m.directive('translate', [translateFactory]);
m.directive('translateScope', [translateScopeFactory]);

var DIR_PRIORITY = 99990;
function translateFactory() {
	return {
		restrict: 'AC',
		scope: false,
		priority: DIR_PRIORITY, // Make it whatever number bigger than ng-bind or any other Angular directive's priority
		compile(tElement, tAttrs) {
			var attrValue = tAttrs.translate || tAttrs.t;
			var localeRes;
			if (attrValue) {
				localeRes = require(attrValue + '/i18n');
				if (!localeRes)
					throw new Error('i18n module ' + attrValue + '/i18n has not been loaded yet, require() it at beginning of you main JS file and compile again!');
			} else {
				var scopeEl = tElement.closest('[translate-scope]');
				if (scopeEl.length === 0)
					throw new Error('Missing translate-scope for ' + tElement.html());
				localeRes = scopeEl.data('drI18n');
			}
			var translated = localeRes[tElement.html()];
			if (translated) {
				tElement.html(translated);
			} else if (api.config().devMode) {
				console.error('missing i18n resource for "%s"', tElement.html());
			}
			return function(scope, iElement, iAttrs) {
			};
		}
	};
}

function translateScopeFactory() {
	return {
		restrict: 'AC',
		scope: false,
		priority: DIR_PRIORITY + 9, // Make it whatever number bigger than DIR_PRIORITY
		controller: ['$scope', '$attrs', function($scope, $attrs) {
			$scope.$drTransScope = $attrs.translateScope;
		}],
		compile(tElement, tAttrs) {
			var packageName = tAttrs.translateScope + '/i18n';
			tElement.data('drI18n', require(packageName));
			return function() {};
		}
	};
}
