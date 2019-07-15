"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const injector_factory_1 = require("./injector-factory");
exports.InjectorFactory = injector_factory_1.DrPackageInjector;
function doInjectorConfig(factory, isNode = false) {
    const config = require('../lib/config');
    return config.configHandlerMgr().runEach((file, lastResult, handler) => {
        if (isNode && handler.setupNodeInjector)
            handler.setupNodeInjector(factory);
        else if (!isNode && handler.setupWebInjector)
            handler.setupWebInjector(factory);
    });
}
exports.doInjectorConfig = doInjectorConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWlyZS1pbmplY3RvcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9yZXF1aXJlLWluamVjdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBLHlEQUFxRDtBQUN4QiwwQkFEckIsb0NBQWlCLENBQ21CO0FBYzVDLFNBQWdCLGdCQUFnQixDQUFDLE9BQTBCLEVBQUUsTUFBTSxHQUFHLEtBQUs7SUFDekUsTUFBTSxNQUFNLEdBQWUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUF3QixDQUFDLElBQVksRUFBRSxVQUFlLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDekcsSUFBSSxNQUFNLElBQUksT0FBTyxDQUFDLGlCQUFpQjtZQUNyQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEMsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsZ0JBQWdCO1lBQzFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFSRCw0Q0FRQyJ9