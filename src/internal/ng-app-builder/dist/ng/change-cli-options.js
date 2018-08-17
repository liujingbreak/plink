"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function changeOptions(config, browserOptions, builderConfig) {
    const currPackageName = require('../../package.json').name;
    for (const prop of ['deployUrl', 'outputPath']) {
        const value = config.get([currPackageName, prop]);
        if (value != null) {
            browserOptions[prop] = value;
            console.log(currPackageName + ' - override %s: %s', prop, value);
        }
    }
}
exports.default = changeOptions;

//# sourceMappingURL=change-cli-options.js.map
