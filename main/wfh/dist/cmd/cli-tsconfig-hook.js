"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doTsconfig = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const editor_helper_1 = require("../editor-helper");
// import {getLogger} from 'log4js';
const misc_1 = require("../utils/misc");
const store_1 = require("../store");
function doTsconfig(opts) {
    if (opts.hook && opts.hook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.hookTsconfig(opts.hook);
    }
    if (opts.unhook && opts.unhook.length > 0) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.unHookTsconfig(opts.unhook);
    }
    if (opts.unhookAll) {
        store_1.dispatcher.changeActionOnExit('save');
        editor_helper_1.dispatcher.unHookAll();
    }
    (0, editor_helper_1.getStore)().pipe(op.map(s => s.tsconfigByRelPath), op.distinctUntilChanged(), op.filter(datas => {
        if (datas.size > 0) {
            return true;
        }
        // eslint-disable-next-line no-console
        console.log('No hooked files found, hook file by command options "--hook <file>"');
        return false;
    }), op.debounceTime(0), // There will be two change events happening, let's get the last change result only
    op.tap((datas) => {
        // eslint-disable-next-line no-console
        console.log('Hooked tsconfig files:');
        for (const data of datas.values()) {
            // eslint-disable-next-line no-console
            console.log('  ' + path_1.default.resolve((0, misc_1.getRootDir)(), data.relPath));
        }
    })).subscribe();
}
exports.doTsconfig = doTsconfig;
//# sourceMappingURL=cli-tsconfig-hook.js.map