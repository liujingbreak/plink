module.exports = function(injector) {
	/**
	 *  IoC configuration here.
	 *  You can inject(aka replacement) required value from specific component package to some value
	 *  you want by:
	 *
	 *  injector.fromPackage('component-package')
	 *  	.substitute('depenency-package', 'another-package')
	 *  	.value('depenency-package', anyValue)
	 *  	.factory('depenency-package', function() { return anyValue; });
	 *
	 *  // Inject to all component packages:
	 *
	 *  injector.fromAllComponents()
	 *  	.substitute('depenency-package', 'another-package');
	 *
	 *  // Or for all Node packages
	 *  injector.fromDir(['src', 'node_modules'])
	 *      .substitute('depenency-package', 'another-package');
	 */
};
