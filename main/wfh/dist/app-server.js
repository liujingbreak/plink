"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const index_1 = require("./index");
const log_config_1 = __importDefault(require("./log-config"));
const override_commander_1 = require("./cmd/override-commander");
const pk = require('../../package.json');
process.title = 'Plink - server';
const program = new commander_1.default.Command()
    .arguments('[args...]')
    .action((args) => __awaiter(void 0, void 0, void 0, function* () {
    // tslint:disable-next-line: no-console
    console.log('\nPlink version:', pk.version);
    const serverStarted = new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
        index_1.initProcess(() => {
            return serverStarted.then(shutdown => shutdown());
        });
        const setting = index_1.initConfig(program.opts());
        log_config_1.default(setting());
        const { runServer } = require('./package-runner');
        const shutdown = yield runServer();
        resolve(shutdown);
    }));
}));
override_commander_1.withGlobalOptions(program);
program.parseAsync(process.argv)
    .catch(e => {
    console.error(e, e.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQStEO0FBRS9ELDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFFM0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQztBQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO0tBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7S0FDdEIsTUFBTSxDQUFDLENBQU8sSUFBYyxFQUFFLEVBQUU7SUFDL0IsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTVDLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxDQUFzQixDQUFNLE9BQU8sRUFBQyxFQUFFO1FBQ3JFLG1CQUFXLENBQUMsR0FBRyxFQUFFO1lBQ2YsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLGtCQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDO1FBQzVELG9CQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNyQixNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFtQixDQUFDO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDbkMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUgsc0NBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFM0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0tBQy9CLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zLCBpbml0Q29uZmlnLCBpbml0UHJvY2Vzc30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuL2xvZy1jb25maWcnO1xuaW1wb3J0IHt3aXRoR2xvYmFsT3B0aW9uc30gZnJvbSAnLi9jbWQvb3ZlcnJpZGUtY29tbWFuZGVyJztcblxuY29uc3QgcGsgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKTtcblxucHJvY2Vzcy50aXRsZSA9ICdQbGluayAtIHNlcnZlcic7XG5cbmNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoKVxuLmFyZ3VtZW50cygnW2FyZ3MuLi5dJylcbi5hY3Rpb24oYXN5bmMgKGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnXFxuUGxpbmsgdmVyc2lvbjonLCBway52ZXJzaW9uKTtcblxuICBjb25zdCBzZXJ2ZXJTdGFydGVkID0gbmV3IFByb21pc2U8KCkgPT4gUHJvbWlzZTx2b2lkPj4oYXN5bmMgcmVzb2x2ZSA9PiB7XG4gICAgaW5pdFByb2Nlc3MoKCkgPT4ge1xuICAgICAgcmV0dXJuIHNlcnZlclN0YXJ0ZWQudGhlbihzaHV0ZG93biA9PiBzaHV0ZG93bigpKTtcbiAgICB9KTtcbiAgICBjb25zdCBzZXR0aW5nID0gaW5pdENvbmZpZyhwcm9ncmFtLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICBsb2dDb25maWcoc2V0dGluZygpKTtcbiAgICBjb25zdCB7cnVuU2VydmVyfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1ydW5uZXInKSBhcyB0eXBlb2YgX3J1bm5lcjtcbiAgICBjb25zdCBzaHV0ZG93biA9IGF3YWl0IHJ1blNlcnZlcigpO1xuICAgIHJlc29sdmUoc2h1dGRvd24pO1xuICB9KTtcbn0pO1xuXG53aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxucHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndilcbi5jYXRjaChlID0+IHtcbiAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG4iXX0=