"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const commander_1 = tslib_1.__importDefault(require("commander"));
const fork_for_preserve_symlink_1 = tslib_1.__importDefault(require("./fork-for-preserve-symlink"));
const log_config_1 = tslib_1.__importDefault(require("./log-config"));
(0, fork_for_preserve_symlink_1.default)('@wfh/plink/wfh/dist/app-server.js', { stateExitAction: 'none', handleShutdownMsg: true }, () => {
    const { version } = require('../../package.json');
    /** Emitted function will be executed during server shutdown phase */
    process.title = 'Plink - server';
    const program = new commander_1.default.Command()
        .arguments('[args...]')
        .action(() => {
        // eslint-disable-next-line no-console
        console.log('\nPlink version:', version);
        const { initConfig, exitHooks } = require('./utils/bootstrap-process');
        const setting = initConfig(program.opts());
        (0, log_config_1.default)(setting());
        const { runServer } = require('./package-runner');
        const shutdown = runServer().shutdown;
        exitHooks.push(shutdown);
    });
    const { withGlobalOptions } = require('./cmd/override-commander');
    withGlobalOptions(program);
    program.parseAsync(process.argv)
        .catch((e) => {
        console.error(e, e.stack);
        process.exit(1);
    });
});
//# sourceMappingURL=app-server.js.map