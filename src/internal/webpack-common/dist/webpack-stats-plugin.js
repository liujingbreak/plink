"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
class StatsPlugin {
    apply(compiler) {
        compiler.hooks.done.tap('PlinkWebpackStatsPlugin', (stats) => {
            log.info(stats.toString('normal'));
        });
    }
}
exports.default = StatsPlugin;
//# sourceMappingURL=webpack-stats-plugin.js.map