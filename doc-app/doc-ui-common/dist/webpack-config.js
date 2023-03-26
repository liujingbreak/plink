"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler = {
    changeCraPaths(_craPaths) {
    },
    webpack(cfg, _env, _cmdOpt) {
        // To work around issue: canvas-5-polyfill requiring node-canvas during Webpack compilation
        cfg.externals = [...(Array.isArray(cfg.externals) ? cfg.externals : []), 'canvas'];
    }
};
exports.default = handler;
//# sourceMappingURL=webpack-config.js.map