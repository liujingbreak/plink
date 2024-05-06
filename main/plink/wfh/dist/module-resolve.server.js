"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const config_1 = tslib_1.__importDefault(require("./config"));
function default_1(injector) {
    const chalk = require('chalk');
    injector.fromAllComponents()
        .factory('chalk', function () {
        return new chalk.constructor({ enabled: config_1.default.get('colorfulConsole') !== false && _.toLower(process.env.CHALK_ENABLED) !== 'false' });
    });
}
exports.default = default_1;
//# sourceMappingURL=module-resolve.server.js.map