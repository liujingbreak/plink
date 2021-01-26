// // @ts-check
// var _ = require('lodash');
// var log = require('log4js').getLogger('packageRunner');
// var config = require('../config');
// var NodeApi = require('../../dist/package-mgr/node-package-api');
// var Promise = require('bluebird');
// var util = require('util');
// var helper = require('./packageRunnerHelper');
// var priorityHelper = require('../../dist/package-priority-helper');
// const {ServerRunner} = require('../../dist/package-runner');
// /** @type { {[name: string]: ReturnType<(typeof helper)['traversePackages']> extends {[name: string]: Array<infer P>} ? P : unknown}} */
// var packageCache = {};
// /** @type {typeof packageCache} */
// var corePackages = {};
// /** @type {import('../../dist/packageNodeInstance').default []} */
// var deactivateOrder;
// var eventBus;
// eventBus = NodeApi.prototype.eventBus;
// module.exports = {
// 	runServer,
// 	eventBus,
// 	requireServerPackages,
// 	activateNormalComponents,
// 	activateCoreComponents,
// 	packages: packageCache,
// 	corePackages,
// 	listServerComponents,
// 	listBuilderComponents
// };
// function runServer(argv) {
// 	var packagesTypeMap;
// 	NodeApi.prototype.argv = argv;
// 	return Promise.coroutine(function*() {
// 		packagesTypeMap = requireServerPackages();
// 		deactivateOrder = [];
// 		yield activateCoreComponents();
// 		yield activateNormalComponents();
// 		var newRunner = new ServerRunner();
// 		deactivateOrder.reverse();
// 		newRunner.deactivatePackages = deactivateOrder;
// 		yield new Promise(resolve => setTimeout(resolve, 500));
// 		return () => {
// 			return newRunner.shutdownServer();
// 		};
// 	})();
// }
// function requireServerPackages(dontLoad) {
// 	const packagesTypeMap = helper.traversePackages(!dontLoad)
// 	// var proto = NodeApi.prototype;
// 	// proto.argv = argv;
// 	// create API instance and inject factories
// 	_.each(packagesTypeMap.server, (p, idx) => {
// 		if (!checkPackageName(p.scope, p.shortName, false)) {
// 			return;
// 		}
// 		if (_.includes([].concat(_.get(p, 'json.dr.type')), 'core')) {
// 			corePackages[p.shortName] = p;
// 		} else {
// 			packageCache[p.shortName] = p;
// 		}
// 		// if (!dontLoad)
// 		// 	p.exports = require(p.moduleName);
// 	});
// 	eventBus.emit('loadEnd', packageCache);
// 	return packagesTypeMap;
// }
// function activateCoreComponents() {
// 	return _activePackages(corePackages, 'coreActivated');
// }
// function activateNormalComponents() {
// 	return _activePackages(packageCache, 'packagesActivated');
// }
// function _activePackages(packages, eventName) {
// 	return priorityHelper.orderPackages(_.values(packages), pkInstance => {
// 		deactivateOrder.push(pkInstance);
// 		return helper.runServerComponent(pkInstance);
// 	}, 'json.dr.serverPriority')
// 	.then(function() {
// 		NodeApi.prototype.eventBus.emit(eventName, packages);
// 	});
// }
// /**
//  * Console list package in order of running priority
//  * @return Array<Object<{pk: {package}, desc: {string}}>>
//  */
// function listServerComponents() {
// 	return Promise.coroutine(function*() {
// 		requireServerPackages(true);
// 		var idx = 0;
// 		var coreList = _.values(corePackages);
// 		var normalList = _.values(packageCache);
// 		var packages = [];
// 		packages.push(...coreList, ...normalList);
// 		var maxLenPackage = _.maxBy(packages, pk => pk.longName.length);
// 		var maxNameLe = maxLenPackage ? maxLenPackage.longName.length : 0;
// 		var list = [];
// 		yield priorityHelper.orderPackages(coreList, pk => {
// 			idx++;
// 			var gapLen = maxNameLe - pk.longName.length;
// 			var gap = new Array(gapLen);
// 			_.fill(gap, ' ');
// 			list.push({
// 				pk,
// 				desc: util.format('%d. %s %s[core] priority: %s',
// 					idx, pk.longName, gap.join(''), _.get(pk, 'json.dr.serverPriority', 5000)),
// 			});
// 		}, 'json.dr.serverPriority');
// 		yield priorityHelper.orderPackages(normalList, pk => {
// 			idx++;
// 			var gapLen = maxNameLe - pk.longName.length;
// 			var gap = new Array(gapLen);
// 			_.fill(gap, ' ');
// 			list.push({
// 				pk,
// 				desc: util.format('%d. %s %s       priority: %s',
// 					idx, pk.longName, gap.join(''), _.get(pk, 'json.dr.serverPriority', 5000)),
// 			});
// 		}, 'json.dr.serverPriority');
// 		return list;
// 	})();
// }
// function listBuilderComponents() {
// 	var util = require('util');
// 	return Promise.coroutine(function*() {
// 		var {builder: packages} = helper.traversePackages(false);
// 		var idx = 0;
// 		var maxLenPackage = _.maxBy(packages, pk => pk.longName.length);
// 		var maxNameLe = maxLenPackage ? maxLenPackage.longName.length : 0;
// 		var list = [];
// 		yield priorityHelper.orderPackages(packages, pk => {
// 			idx++;
// 			var gapLen = maxNameLe - pk.longName.length;
// 			var gap = new Array(gapLen);
// 			_.fill(gap, ' ');
// 			list.push({
// 				pk,
// 				desc: util.format('%d. %s %s priority: %s', idx, pk.longName, gap.join(''), _.get(pk, 'json.dr.builderPriority')),
// 			});
// 		}, 'json.dr.builderPriority');
// 		return list;
// 	})();
// }
// function checkPackageName(scope, shortName, unknownScopeWarn) {
// 	if (!_.includes(config().packageScopes, scope)) {
// 		if (unknownScopeWarn) {
// 			log.warn('Skip node module of unknown scope: ' + shortName);
// 		}
// 		return false;
// 	}
// 	//log.debug('', new Error())
// 	if (_.has(packageCache, shortName) ||
// 		_.has(corePackages, shortName)) {
// 		log.debug(shortName + ' has already been loaded');
// 		return false;
// 	}
// 	return true;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1hY3RpdmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zZXJ2ZXIvcGFja2FnZS1hY3RpdmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsZUFBZTtBQUNmLDZCQUE2QjtBQUM3QiwwREFBMEQ7QUFDMUQscUNBQXFDO0FBQ3JDLG9FQUFvRTtBQUNwRSxxQ0FBcUM7QUFDckMsOEJBQThCO0FBQzlCLGlEQUFpRDtBQUNqRCxzRUFBc0U7QUFDdEUsK0RBQStEO0FBRS9ELDJJQUEySTtBQUMzSSx5QkFBeUI7QUFDekIscUNBQXFDO0FBQ3JDLHlCQUF5QjtBQUN6QixxRUFBcUU7QUFDckUsdUJBQXVCO0FBRXZCLGdCQUFnQjtBQUVoQix5Q0FBeUM7QUFDekMscUJBQXFCO0FBQ3JCLGNBQWM7QUFDZCxhQUFhO0FBQ2IsMEJBQTBCO0FBQzFCLDZCQUE2QjtBQUM3QiwyQkFBMkI7QUFDM0IsMkJBQTJCO0FBQzNCLGlCQUFpQjtBQUNqQix5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLEtBQUs7QUFFTCw2QkFBNkI7QUFDN0Isd0JBQXdCO0FBQ3hCLGtDQUFrQztBQUVsQywwQ0FBMEM7QUFDMUMsK0NBQStDO0FBQy9DLDBCQUEwQjtBQUMxQixvQ0FBb0M7QUFDcEMsc0NBQXNDO0FBQ3RDLHdDQUF3QztBQUN4QywrQkFBK0I7QUFDL0Isb0RBQW9EO0FBQ3BELDREQUE0RDtBQUM1RCxtQkFBbUI7QUFDbkIsd0NBQXdDO0FBQ3hDLE9BQU87QUFDUCxTQUFTO0FBQ1QsSUFBSTtBQUVKLDZDQUE2QztBQUM3Qyw4REFBOEQ7QUFDOUQscUNBQXFDO0FBQ3JDLHlCQUF5QjtBQUV6QiwrQ0FBK0M7QUFFL0MsZ0RBQWdEO0FBQ2hELDBEQUEwRDtBQUMxRCxhQUFhO0FBQ2IsTUFBTTtBQUNOLG1FQUFtRTtBQUNuRSxvQ0FBb0M7QUFDcEMsYUFBYTtBQUNiLG9DQUFvQztBQUNwQyxNQUFNO0FBQ04sc0JBQXNCO0FBQ3RCLDJDQUEyQztBQUMzQyxPQUFPO0FBQ1AsMkNBQTJDO0FBQzNDLDJCQUEyQjtBQUMzQixJQUFJO0FBRUosc0NBQXNDO0FBQ3RDLDBEQUEwRDtBQUMxRCxJQUFJO0FBRUosd0NBQXdDO0FBQ3hDLDhEQUE4RDtBQUM5RCxJQUFJO0FBRUosa0RBQWtEO0FBQ2xELDJFQUEyRTtBQUMzRSxzQ0FBc0M7QUFDdEMsa0RBQWtEO0FBQ2xELGdDQUFnQztBQUNoQyxzQkFBc0I7QUFDdEIsMERBQTBEO0FBQzFELE9BQU87QUFDUCxJQUFJO0FBRUosTUFBTTtBQUNOLHVEQUF1RDtBQUN2RCw0REFBNEQ7QUFDNUQsTUFBTTtBQUNOLG9DQUFvQztBQUNwQywwQ0FBMEM7QUFDMUMsaUNBQWlDO0FBQ2pDLGlCQUFpQjtBQUVqQiwyQ0FBMkM7QUFDM0MsNkNBQTZDO0FBQzdDLHVCQUF1QjtBQUN2QiwrQ0FBK0M7QUFDL0MscUVBQXFFO0FBQ3JFLHVFQUF1RTtBQUV2RSxtQkFBbUI7QUFDbkIseURBQXlEO0FBQ3pELFlBQVk7QUFDWixrREFBa0Q7QUFDbEQsa0NBQWtDO0FBQ2xDLHVCQUF1QjtBQUN2QixpQkFBaUI7QUFDakIsVUFBVTtBQUNWLHdEQUF3RDtBQUN4RCxtRkFBbUY7QUFDbkYsU0FBUztBQUNULGtDQUFrQztBQUNsQywyREFBMkQ7QUFDM0QsWUFBWTtBQUNaLGtEQUFrRDtBQUNsRCxrQ0FBa0M7QUFDbEMsdUJBQXVCO0FBQ3ZCLGlCQUFpQjtBQUNqQixVQUFVO0FBQ1Ysd0RBQXdEO0FBQ3hELG1GQUFtRjtBQUNuRixTQUFTO0FBQ1Qsa0NBQWtDO0FBQ2xDLGlCQUFpQjtBQUNqQixTQUFTO0FBQ1QsSUFBSTtBQUVKLHFDQUFxQztBQUNyQywrQkFBK0I7QUFDL0IsMENBQTBDO0FBQzFDLDhEQUE4RDtBQUM5RCxpQkFBaUI7QUFDakIscUVBQXFFO0FBQ3JFLHVFQUF1RTtBQUN2RSxtQkFBbUI7QUFFbkIseURBQXlEO0FBQ3pELFlBQVk7QUFDWixrREFBa0Q7QUFDbEQsa0NBQWtDO0FBQ2xDLHVCQUF1QjtBQUN2QixpQkFBaUI7QUFDakIsVUFBVTtBQUNWLHlIQUF5SDtBQUN6SCxTQUFTO0FBQ1QsbUNBQW1DO0FBQ25DLGlCQUFpQjtBQUNqQixTQUFTO0FBQ1QsSUFBSTtBQUVKLGtFQUFrRTtBQUNsRSxxREFBcUQ7QUFDckQsNEJBQTRCO0FBQzVCLGtFQUFrRTtBQUNsRSxNQUFNO0FBQ04sa0JBQWtCO0FBQ2xCLEtBQUs7QUFDTCxnQ0FBZ0M7QUFDaEMseUNBQXlDO0FBQ3pDLHNDQUFzQztBQUN0Qyx1REFBdUQ7QUFDdkQsa0JBQWtCO0FBQ2xCLEtBQUs7QUFDTCxnQkFBZ0I7QUFDaEIsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8vIC8vIEB0cy1jaGVja1xuLy8gdmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcbi8vIHZhciBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3BhY2thZ2VSdW5uZXInKTtcbi8vIHZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcbi8vIHZhciBOb2RlQXBpID0gcmVxdWlyZSgnLi4vLi4vZGlzdC9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4vLyB2YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJyk7XG4vLyB2YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbi8vIHZhciBoZWxwZXIgPSByZXF1aXJlKCcuL3BhY2thZ2VSdW5uZXJIZWxwZXInKTtcbi8vIHZhciBwcmlvcml0eUhlbHBlciA9IHJlcXVpcmUoJy4uLy4uL2Rpc3QvcGFja2FnZS1wcmlvcml0eS1oZWxwZXInKTtcbi8vIGNvbnN0IHtTZXJ2ZXJSdW5uZXJ9ID0gcmVxdWlyZSgnLi4vLi4vZGlzdC9wYWNrYWdlLXJ1bm5lcicpO1xuXG4vLyAvKiogQHR5cGUgeyB7W25hbWU6IHN0cmluZ106IFJldHVyblR5cGU8KHR5cGVvZiBoZWxwZXIpWyd0cmF2ZXJzZVBhY2thZ2VzJ10+IGV4dGVuZHMge1tuYW1lOiBzdHJpbmddOiBBcnJheTxpbmZlciBQPn0gPyBQIDogdW5rbm93bn19ICovXG4vLyB2YXIgcGFja2FnZUNhY2hlID0ge307XG4vLyAvKiogQHR5cGUge3R5cGVvZiBwYWNrYWdlQ2FjaGV9ICovXG4vLyB2YXIgY29yZVBhY2thZ2VzID0ge307XG4vLyAvKiogQHR5cGUge2ltcG9ydCgnLi4vLi4vZGlzdC9wYWNrYWdlTm9kZUluc3RhbmNlJykuZGVmYXVsdCBbXX0gKi9cbi8vIHZhciBkZWFjdGl2YXRlT3JkZXI7XG5cbi8vIHZhciBldmVudEJ1cztcblxuLy8gZXZlbnRCdXMgPSBOb2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cztcbi8vIG1vZHVsZS5leHBvcnRzID0ge1xuLy8gXHRydW5TZXJ2ZXIsXG4vLyBcdGV2ZW50QnVzLFxuLy8gXHRyZXF1aXJlU2VydmVyUGFja2FnZXMsXG4vLyBcdGFjdGl2YXRlTm9ybWFsQ29tcG9uZW50cyxcbi8vIFx0YWN0aXZhdGVDb3JlQ29tcG9uZW50cyxcbi8vIFx0cGFja2FnZXM6IHBhY2thZ2VDYWNoZSxcbi8vIFx0Y29yZVBhY2thZ2VzLFxuLy8gXHRsaXN0U2VydmVyQ29tcG9uZW50cyxcbi8vIFx0bGlzdEJ1aWxkZXJDb21wb25lbnRzXG4vLyB9O1xuXG4vLyBmdW5jdGlvbiBydW5TZXJ2ZXIoYXJndikge1xuLy8gXHR2YXIgcGFja2FnZXNUeXBlTWFwO1xuLy8gXHROb2RlQXBpLnByb3RvdHlwZS5hcmd2ID0gYXJndjtcblxuLy8gXHRyZXR1cm4gUHJvbWlzZS5jb3JvdXRpbmUoZnVuY3Rpb24qKCkge1xuLy8gXHRcdHBhY2thZ2VzVHlwZU1hcCA9IHJlcXVpcmVTZXJ2ZXJQYWNrYWdlcygpO1xuLy8gXHRcdGRlYWN0aXZhdGVPcmRlciA9IFtdO1xuLy8gXHRcdHlpZWxkIGFjdGl2YXRlQ29yZUNvbXBvbmVudHMoKTtcbi8vIFx0XHR5aWVsZCBhY3RpdmF0ZU5vcm1hbENvbXBvbmVudHMoKTtcbi8vIFx0XHR2YXIgbmV3UnVubmVyID0gbmV3IFNlcnZlclJ1bm5lcigpO1xuLy8gXHRcdGRlYWN0aXZhdGVPcmRlci5yZXZlcnNlKCk7XG4vLyBcdFx0bmV3UnVubmVyLmRlYWN0aXZhdGVQYWNrYWdlcyA9IGRlYWN0aXZhdGVPcmRlcjtcbi8vIFx0XHR5aWVsZCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4vLyBcdFx0cmV0dXJuICgpID0+IHtcbi8vIFx0XHRcdHJldHVybiBuZXdSdW5uZXIuc2h1dGRvd25TZXJ2ZXIoKTtcbi8vIFx0XHR9O1xuLy8gXHR9KSgpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiByZXF1aXJlU2VydmVyUGFja2FnZXMoZG9udExvYWQpIHtcbi8vIFx0Y29uc3QgcGFja2FnZXNUeXBlTWFwID0gaGVscGVyLnRyYXZlcnNlUGFja2FnZXMoIWRvbnRMb2FkKVxuLy8gXHQvLyB2YXIgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbi8vIFx0Ly8gcHJvdG8uYXJndiA9IGFyZ3Y7XG5cbi8vIFx0Ly8gY3JlYXRlIEFQSSBpbnN0YW5jZSBhbmQgaW5qZWN0IGZhY3Rvcmllc1xuXG4vLyBcdF8uZWFjaChwYWNrYWdlc1R5cGVNYXAuc2VydmVyLCAocCwgaWR4KSA9PiB7XG4vLyBcdFx0aWYgKCFjaGVja1BhY2thZ2VOYW1lKHAuc2NvcGUsIHAuc2hvcnROYW1lLCBmYWxzZSkpIHtcbi8vIFx0XHRcdHJldHVybjtcbi8vIFx0XHR9XG4vLyBcdFx0aWYgKF8uaW5jbHVkZXMoW10uY29uY2F0KF8uZ2V0KHAsICdqc29uLmRyLnR5cGUnKSksICdjb3JlJykpIHtcbi8vIFx0XHRcdGNvcmVQYWNrYWdlc1twLnNob3J0TmFtZV0gPSBwO1xuLy8gXHRcdH0gZWxzZSB7XG4vLyBcdFx0XHRwYWNrYWdlQ2FjaGVbcC5zaG9ydE5hbWVdID0gcDtcbi8vIFx0XHR9XG4vLyBcdFx0Ly8gaWYgKCFkb250TG9hZClcbi8vIFx0XHQvLyBcdHAuZXhwb3J0cyA9IHJlcXVpcmUocC5tb2R1bGVOYW1lKTtcbi8vIFx0fSk7XG4vLyBcdGV2ZW50QnVzLmVtaXQoJ2xvYWRFbmQnLCBwYWNrYWdlQ2FjaGUpO1xuLy8gXHRyZXR1cm4gcGFja2FnZXNUeXBlTWFwO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBhY3RpdmF0ZUNvcmVDb21wb25lbnRzKCkge1xuLy8gXHRyZXR1cm4gX2FjdGl2ZVBhY2thZ2VzKGNvcmVQYWNrYWdlcywgJ2NvcmVBY3RpdmF0ZWQnKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gYWN0aXZhdGVOb3JtYWxDb21wb25lbnRzKCkge1xuLy8gXHRyZXR1cm4gX2FjdGl2ZVBhY2thZ2VzKHBhY2thZ2VDYWNoZSwgJ3BhY2thZ2VzQWN0aXZhdGVkJyk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIF9hY3RpdmVQYWNrYWdlcyhwYWNrYWdlcywgZXZlbnROYW1lKSB7XG4vLyBcdHJldHVybiBwcmlvcml0eUhlbHBlci5vcmRlclBhY2thZ2VzKF8udmFsdWVzKHBhY2thZ2VzKSwgcGtJbnN0YW5jZSA9PiB7XG4vLyBcdFx0ZGVhY3RpdmF0ZU9yZGVyLnB1c2gocGtJbnN0YW5jZSk7XG4vLyBcdFx0cmV0dXJuIGhlbHBlci5ydW5TZXJ2ZXJDb21wb25lbnQocGtJbnN0YW5jZSk7XG4vLyBcdH0sICdqc29uLmRyLnNlcnZlclByaW9yaXR5Jylcbi8vIFx0LnRoZW4oZnVuY3Rpb24oKSB7XG4vLyBcdFx0Tm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMuZW1pdChldmVudE5hbWUsIHBhY2thZ2VzKTtcbi8vIFx0fSk7XG4vLyB9XG5cbi8vIC8qKlxuLy8gICogQ29uc29sZSBsaXN0IHBhY2thZ2UgaW4gb3JkZXIgb2YgcnVubmluZyBwcmlvcml0eVxuLy8gICogQHJldHVybiBBcnJheTxPYmplY3Q8e3BrOiB7cGFja2FnZX0sIGRlc2M6IHtzdHJpbmd9fT4+XG4vLyAgKi9cbi8vIGZ1bmN0aW9uIGxpc3RTZXJ2ZXJDb21wb25lbnRzKCkge1xuLy8gXHRyZXR1cm4gUHJvbWlzZS5jb3JvdXRpbmUoZnVuY3Rpb24qKCkge1xuLy8gXHRcdHJlcXVpcmVTZXJ2ZXJQYWNrYWdlcyh0cnVlKTtcbi8vIFx0XHR2YXIgaWR4ID0gMDtcblxuLy8gXHRcdHZhciBjb3JlTGlzdCA9IF8udmFsdWVzKGNvcmVQYWNrYWdlcyk7XG4vLyBcdFx0dmFyIG5vcm1hbExpc3QgPSBfLnZhbHVlcyhwYWNrYWdlQ2FjaGUpO1xuLy8gXHRcdHZhciBwYWNrYWdlcyA9IFtdO1xuLy8gXHRcdHBhY2thZ2VzLnB1c2goLi4uY29yZUxpc3QsIC4uLm5vcm1hbExpc3QpO1xuLy8gXHRcdHZhciBtYXhMZW5QYWNrYWdlID0gXy5tYXhCeShwYWNrYWdlcywgcGsgPT4gcGsubG9uZ05hbWUubGVuZ3RoKTtcbi8vIFx0XHR2YXIgbWF4TmFtZUxlID0gbWF4TGVuUGFja2FnZSA/IG1heExlblBhY2thZ2UubG9uZ05hbWUubGVuZ3RoIDogMDtcblxuLy8gXHRcdHZhciBsaXN0ID0gW107XG4vLyBcdFx0eWllbGQgcHJpb3JpdHlIZWxwZXIub3JkZXJQYWNrYWdlcyhjb3JlTGlzdCwgcGsgPT4ge1xuLy8gXHRcdFx0aWR4Kys7XG4vLyBcdFx0XHR2YXIgZ2FwTGVuID0gbWF4TmFtZUxlIC0gcGsubG9uZ05hbWUubGVuZ3RoO1xuLy8gXHRcdFx0dmFyIGdhcCA9IG5ldyBBcnJheShnYXBMZW4pO1xuLy8gXHRcdFx0Xy5maWxsKGdhcCwgJyAnKTtcbi8vIFx0XHRcdGxpc3QucHVzaCh7XG4vLyBcdFx0XHRcdHBrLFxuLy8gXHRcdFx0XHRkZXNjOiB1dGlsLmZvcm1hdCgnJWQuICVzICVzW2NvcmVdIHByaW9yaXR5OiAlcycsXG4vLyBcdFx0XHRcdFx0aWR4LCBway5sb25nTmFtZSwgZ2FwLmpvaW4oJycpLCBfLmdldChwaywgJ2pzb24uZHIuc2VydmVyUHJpb3JpdHknLCA1MDAwKSksXG4vLyBcdFx0XHR9KTtcbi8vIFx0XHR9LCAnanNvbi5kci5zZXJ2ZXJQcmlvcml0eScpO1xuLy8gXHRcdHlpZWxkIHByaW9yaXR5SGVscGVyLm9yZGVyUGFja2FnZXMobm9ybWFsTGlzdCwgcGsgPT4ge1xuLy8gXHRcdFx0aWR4Kys7XG4vLyBcdFx0XHR2YXIgZ2FwTGVuID0gbWF4TmFtZUxlIC0gcGsubG9uZ05hbWUubGVuZ3RoO1xuLy8gXHRcdFx0dmFyIGdhcCA9IG5ldyBBcnJheShnYXBMZW4pO1xuLy8gXHRcdFx0Xy5maWxsKGdhcCwgJyAnKTtcbi8vIFx0XHRcdGxpc3QucHVzaCh7XG4vLyBcdFx0XHRcdHBrLFxuLy8gXHRcdFx0XHRkZXNjOiB1dGlsLmZvcm1hdCgnJWQuICVzICVzICAgICAgIHByaW9yaXR5OiAlcycsXG4vLyBcdFx0XHRcdFx0aWR4LCBway5sb25nTmFtZSwgZ2FwLmpvaW4oJycpLCBfLmdldChwaywgJ2pzb24uZHIuc2VydmVyUHJpb3JpdHknLCA1MDAwKSksXG4vLyBcdFx0XHR9KTtcbi8vIFx0XHR9LCAnanNvbi5kci5zZXJ2ZXJQcmlvcml0eScpO1xuLy8gXHRcdHJldHVybiBsaXN0O1xuLy8gXHR9KSgpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBsaXN0QnVpbGRlckNvbXBvbmVudHMoKSB7XG4vLyBcdHZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuLy8gXHRyZXR1cm4gUHJvbWlzZS5jb3JvdXRpbmUoZnVuY3Rpb24qKCkge1xuLy8gXHRcdHZhciB7YnVpbGRlcjogcGFja2FnZXN9ID0gaGVscGVyLnRyYXZlcnNlUGFja2FnZXMoZmFsc2UpO1xuLy8gXHRcdHZhciBpZHggPSAwO1xuLy8gXHRcdHZhciBtYXhMZW5QYWNrYWdlID0gXy5tYXhCeShwYWNrYWdlcywgcGsgPT4gcGsubG9uZ05hbWUubGVuZ3RoKTtcbi8vIFx0XHR2YXIgbWF4TmFtZUxlID0gbWF4TGVuUGFja2FnZSA/IG1heExlblBhY2thZ2UubG9uZ05hbWUubGVuZ3RoIDogMDtcbi8vIFx0XHR2YXIgbGlzdCA9IFtdO1xuXG4vLyBcdFx0eWllbGQgcHJpb3JpdHlIZWxwZXIub3JkZXJQYWNrYWdlcyhwYWNrYWdlcywgcGsgPT4ge1xuLy8gXHRcdFx0aWR4Kys7XG4vLyBcdFx0XHR2YXIgZ2FwTGVuID0gbWF4TmFtZUxlIC0gcGsubG9uZ05hbWUubGVuZ3RoO1xuLy8gXHRcdFx0dmFyIGdhcCA9IG5ldyBBcnJheShnYXBMZW4pO1xuLy8gXHRcdFx0Xy5maWxsKGdhcCwgJyAnKTtcbi8vIFx0XHRcdGxpc3QucHVzaCh7XG4vLyBcdFx0XHRcdHBrLFxuLy8gXHRcdFx0XHRkZXNjOiB1dGlsLmZvcm1hdCgnJWQuICVzICVzIHByaW9yaXR5OiAlcycsIGlkeCwgcGsubG9uZ05hbWUsIGdhcC5qb2luKCcnKSwgXy5nZXQocGssICdqc29uLmRyLmJ1aWxkZXJQcmlvcml0eScpKSxcbi8vIFx0XHRcdH0pO1xuLy8gXHRcdH0sICdqc29uLmRyLmJ1aWxkZXJQcmlvcml0eScpO1xuLy8gXHRcdHJldHVybiBsaXN0O1xuLy8gXHR9KSgpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBjaGVja1BhY2thZ2VOYW1lKHNjb3BlLCBzaG9ydE5hbWUsIHVua25vd25TY29wZVdhcm4pIHtcbi8vIFx0aWYgKCFfLmluY2x1ZGVzKGNvbmZpZygpLnBhY2thZ2VTY29wZXMsIHNjb3BlKSkge1xuLy8gXHRcdGlmICh1bmtub3duU2NvcGVXYXJuKSB7XG4vLyBcdFx0XHRsb2cud2FybignU2tpcCBub2RlIG1vZHVsZSBvZiB1bmtub3duIHNjb3BlOiAnICsgc2hvcnROYW1lKTtcbi8vIFx0XHR9XG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHR9XG4vLyBcdC8vbG9nLmRlYnVnKCcnLCBuZXcgRXJyb3IoKSlcbi8vIFx0aWYgKF8uaGFzKHBhY2thZ2VDYWNoZSwgc2hvcnROYW1lKSB8fFxuLy8gXHRcdF8uaGFzKGNvcmVQYWNrYWdlcywgc2hvcnROYW1lKSkge1xuLy8gXHRcdGxvZy5kZWJ1ZyhzaG9ydE5hbWUgKyAnIGhhcyBhbHJlYWR5IGJlZW4gbG9hZGVkJyk7XG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHR9XG4vLyBcdHJldHVybiB0cnVlO1xuLy8gfVxuIl19