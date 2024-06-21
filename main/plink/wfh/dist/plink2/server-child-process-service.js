"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createService = createService;
const tslib_1 = require("tslib");
const node_util_1 = tslib_1.__importDefault(require("node:util"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const nodejs_utils_1 = require("@wfh/reactivizer/dist/nodejs-utils");
// import {initProcess} from '../utils/bootstrap-process';
const fork_for_preserve_symlink_1 = require("../fork-for-preserve-symlink");
const cmd_model_1 = require("./cmd-model");
const cmd_definition_1 = require("./cmd-definition");
const process_common_1 = require("./process-common");
// import inspector from 'inspector';
// inspector.open(9222);
const tableFor = ['setRootDir', 'onCommanderInited'];
function createService(log) {
    function logger(...args) {
        log((0, nodejs_utils_1.formatToConciseNoColor)(...args));
    }
    const service = new reactivizer_1.SimplexReactor({
        name: 'server-child-process-entry',
        debug: true,
        tableFor,
        log: logger
    });
    const { s, r, table } = service;
    (0, cmd_definition_1.define)(service, logger);
    r('cmdModelService.enableRxMessageTrace ->', cmd_model_1.cmdModelService.inputTable.l.enableRxMessageTrace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([, enabled]) => {
        service.config({ debug: enabled });
    })));
    r('doCommand -> onCommandDone', s.pt.doCommand.pipe(rx.mergeMap((a) => table.l.onCommanderInited.pipe(rx.map(([, commander]) => [...a, commander]), rx.take(1))), rx.mergeMap(async ([m, cols, rows, cwd, cmd, commander]) => {
        (0, process_common_1.setupTTY)(cols, rows);
        if (process.cwd() !== cwd) {
            process.chdir(cwd);
            (0, fork_for_preserve_symlink_1.workDirChangedByCli)(cmd);
        }
        const exit = process.exit;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            process.exit = (() => {
                throw new Error('cmd-help');
            }); // commander's help() will invoke process.exit(), I have to void this happends
            await commander.parseAsync(cmd, { from: 'user' });
            s.ft.onCommandDone().dp(m);
        }
        catch (err) {
            if (err.message === 'cmd-help') {
                s.ft.onCommandDone().dp(m);
            }
            else {
                s.ft.onCommandError(node_util_1.default.inspect(err)).dp(m);
                service.dispatchErrorFor(err, m);
            }
        }
        finally {
            process.exit = exit;
        }
    })));
    r('onShutdown', s.pt.onShutdown.pipe(rx.map(() => setImmediate(() => service.dispose()))));
    return service;
}
//# sourceMappingURL=server-child-process-service.js.map