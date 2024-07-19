"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScrollable = createScrollable;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const terminal_widget_1 = require("./terminal-widget");
const terminal_canvas_1 = require("./terminal-canvas");
function createScrollable(component) {
    const comp = (0, terminal_widget_1.createBase)();
    comp.config({});
    const { r, s } = comp;
    const canvas = (0, terminal_canvas_1.createTerminalCanvas)();
    r('configChange', s.configChange.pipe(rx.map(cfg => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const obj = [...cfg.values()].reduce((obj, key) => {
            obj[key] = s.opts[key];
            return obj;
        }, {});
        canvas.config(obj);
    })));
    return comp;
}
//# sourceMappingURL=terminal-scrollable.js.map