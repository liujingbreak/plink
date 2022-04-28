"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const fork_for_preserve_symlink_1 = __importDefault(require("./fork-for-preserve-symlink"));
const log_config_1 = __importDefault(require("./log-config"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsNEZBQWlFO0FBRWpFLDhEQUFxQztBQUlyQyxJQUFBLG1DQUFzQixFQUFDLG1DQUFtQyxFQUFFLEVBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsRUFBRSxHQUFHLEVBQUU7SUFDbkgsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQztJQUVyRSxxRUFBcUU7SUFDckUsT0FBTyxDQUFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQztJQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO1NBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7U0FDdEIsTUFBTSxDQUFDLEdBQUcsRUFBRTtRQUNYLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUF5QixDQUFDO1FBQzdGLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzQyxJQUFBLG9CQUFTLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNyQixNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFtQixDQUFDO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztRQUV0QyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxFQUFDLGlCQUFpQixFQUFDLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixDQUF1QixDQUFDO0lBQ3RGLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTNCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFRLEVBQUUsRUFBRTtRQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHJ1bldpdGhQcmVzZXJ2ZVN5bWxpbmsgZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcbmltcG9ydCAqIGFzIG92ZXJyaWRlQ21kIGZyb20gJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0ICogYXMgYm9vdHN0cmFwUHJvYyBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcblxucnVuV2l0aFByZXNlcnZlU3ltbGluaygnQHdmaC9wbGluay93ZmgvZGlzdC9hcHAtc2VydmVyLmpzJywge3N0YXRlRXhpdEFjdGlvbjogJ25vbmUnLCBoYW5kbGVTaHV0ZG93bk1zZzogdHJ1ZX0sICgpID0+IHtcbiAgY29uc3Qge3ZlcnNpb259ID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG5cbiAgLyoqIEVtaXR0ZWQgZnVuY3Rpb24gd2lsbCBiZSBleGVjdXRlZCBkdXJpbmcgc2VydmVyIHNodXRkb3duIHBoYXNlICovXG4gIHByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoKVxuICAuYXJndW1lbnRzKCdbYXJncy4uLl0nKVxuICAuYWN0aW9uKCgpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG5QbGluayB2ZXJzaW9uOicsIHZlcnNpb24pO1xuICAgIGNvbnN0IHtpbml0Q29uZmlnLCBleGl0SG9va3N9ID0gcmVxdWlyZSgnLi91dGlscy9ib290c3RyYXAtcHJvY2VzcycpIGFzIHR5cGVvZiBib290c3RyYXBQcm9jO1xuICAgIGNvbnN0IHNldHRpbmcgPSBpbml0Q29uZmlnKHByb2dyYW0ub3B0cygpKTtcbiAgICBsb2dDb25maWcoc2V0dGluZygpKTtcbiAgICBjb25zdCB7cnVuU2VydmVyfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1ydW5uZXInKSBhcyB0eXBlb2YgX3J1bm5lcjtcbiAgICBjb25zdCBzaHV0ZG93biA9IHJ1blNlcnZlcigpLnNodXRkb3duO1xuXG4gICAgZXhpdEhvb2tzLnB1c2goc2h1dGRvd24pO1xuICB9KTtcblxuICBjb25zdCB7d2l0aEdsb2JhbE9wdGlvbnN9ID0gcmVxdWlyZSgnLi9jbWQvb3ZlcnJpZGUtY29tbWFuZGVyJykgYXMgdHlwZW9mIG92ZXJyaWRlQ21kO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxuICBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuICAuY2F0Y2goKGU6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH0pO1xufSk7XG5cblxuIl19