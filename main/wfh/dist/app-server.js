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
    const shutdownHooks = [];
    process.title = 'Plink - server';
    const program = new commander_1.default.Command()
        .arguments('[args...]')
        .action(() => {
        // eslint-disable-next-line no-console
        console.log('\nPlink version:', version);
        const { initConfig } = require('./utils/bootstrap-process');
        const setting = initConfig(program.opts());
        (0, log_config_1.default)(setting());
        const { runServer } = require('./package-runner');
        const shutdown = runServer().shutdown;
        shutdownHooks.push(shutdown);
    });
    const { withGlobalOptions } = require('./cmd/override-commander');
    withGlobalOptions(program);
    program.parseAsync(process.argv)
        .catch((e) => {
        console.error(e, e.stack);
        process.exit(1);
    });
    return shutdownHooks;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwREFBa0M7QUFFbEMsNEZBQWlFO0FBRWpFLDhEQUFxQztBQUlyQyxJQUFBLG1DQUFzQixFQUFDLG1DQUFtQyxFQUFFLEVBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsRUFBRSxHQUFHLEVBQUU7SUFDbkgsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQztJQUVyRSxxRUFBcUU7SUFDckUsTUFBTSxhQUFhLEdBQW1ELEVBQUUsQ0FBQztJQUN6RSxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0lBRWpDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLEVBQUU7U0FDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQztTQUN0QixNQUFNLENBQUMsR0FBRyxFQUFFO1FBQ1gsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekMsTUFBTSxFQUFDLFVBQVUsRUFBQyxHQUFHLE9BQU8sQ0FBQywyQkFBMkIsQ0FBeUIsQ0FBQztRQUNsRixNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBQSxvQkFBUyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDckIsTUFBTSxFQUFDLFNBQVMsRUFBQyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBbUIsQ0FBQztRQUNsRSxNQUFNLFFBQVEsR0FBRyxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFFdEMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sRUFBQyxpQkFBaUIsRUFBQyxHQUFHLE9BQU8sQ0FBQywwQkFBMEIsQ0FBdUIsQ0FBQztJQUN0RixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUzQixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDL0IsS0FBSyxDQUFDLENBQUMsQ0FBUSxFQUFFLEVBQUU7UUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLGFBQWEsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHJ1bldpdGhQcmVzZXJ2ZVN5bWxpbmsgZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcbmltcG9ydCAqIGFzIG92ZXJyaWRlQ21kIGZyb20gJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0ICogYXMgYm9vdHN0cmFwUHJvYyBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcblxucnVuV2l0aFByZXNlcnZlU3ltbGluaygnQHdmaC9wbGluay93ZmgvZGlzdC9hcHAtc2VydmVyLmpzJywge3N0YXRlRXhpdEFjdGlvbjogJ25vbmUnLCBoYW5kbGVTaHV0ZG93bk1zZzogdHJ1ZX0sICgpID0+IHtcbiAgY29uc3Qge3ZlcnNpb259ID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG5cbiAgLyoqIEVtaXR0ZWQgZnVuY3Rpb24gd2lsbCBiZSBleGVjdXRlZCBkdXJpbmcgc2VydmVyIHNodXRkb3duIHBoYXNlICovXG4gIGNvbnN0IHNodXRkb3duSG9va3M6ICgoKSA9PiAocnguT2JzZXJ2YWJsZUlucHV0PHVua25vd24+IHwgdm9pZCkpW10gPSBbXTtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayAtIHNlcnZlcic7XG5cbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgpXG4gIC5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4gIC5hY3Rpb24oKCkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcblBsaW5rIHZlcnNpb246JywgdmVyc2lvbik7XG4gICAgY29uc3Qge2luaXRDb25maWd9ID0gcmVxdWlyZSgnLi91dGlscy9ib290c3RyYXAtcHJvY2VzcycpIGFzIHR5cGVvZiBib290c3RyYXBQcm9jO1xuICAgIGNvbnN0IHNldHRpbmcgPSBpbml0Q29uZmlnKHByb2dyYW0ub3B0cygpKTtcbiAgICBsb2dDb25maWcoc2V0dGluZygpKTtcbiAgICBjb25zdCB7cnVuU2VydmVyfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1ydW5uZXInKSBhcyB0eXBlb2YgX3J1bm5lcjtcbiAgICBjb25zdCBzaHV0ZG93biA9IHJ1blNlcnZlcigpLnNodXRkb3duO1xuXG4gICAgc2h1dGRvd25Ib29rcy5wdXNoKHNodXRkb3duKTtcbiAgfSk7XG5cbiAgY29uc3Qge3dpdGhHbG9iYWxPcHRpb25zfSA9IHJlcXVpcmUoJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcicpIGFzIHR5cGVvZiBvdmVycmlkZUNtZDtcbiAgd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbSk7XG5cbiAgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndilcbiAgLmNhdGNoKChlOiBFcnJvcikgPT4ge1xuICAgIGNvbnNvbGUuZXJyb3IoZSwgZS5zdGFjayk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9KTtcbiAgcmV0dXJuIHNodXRkb3duSG9va3M7XG59KTtcblxuXG4iXX0=