"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function changeOptions(builderConfig, browserOptions, config) {
    const currPackageName = require('../../package.json').name;
    for (const prop of ['deployUrl', 'outputPath']) {
        const value = config.get([currPackageName, prop]);
        if (value) {
            browserOptions[prop] = value;
            console.log(currPackageName + ' - override %s: %s', prop, value);
        }
    }
}
exports.default = changeOptions;

//# sourceMappingURL=config-angular-json.js.map
