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
    index_1.initProcess(() => {
        return shutdown();
    });
    const setting = index_1.initConfig(program.opts());
    log_config_1.default(setting());
    const { runServer } = require('./package-runner');
    const { started, shutdown } = runServer();
    yield started;
}));
override_commander_1.withGlobalOptions(program);
program.parseAsync(process.argv)
    .catch(e => {
    console.error(e, e.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQStEO0FBRS9ELDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFFM0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQztBQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO0tBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7S0FDdEIsTUFBTSxDQUFDLENBQU8sSUFBYyxFQUFFLEVBQUU7SUFDL0IsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTVDLG1CQUFXLENBQUMsR0FBRyxFQUFFO1FBQ2YsT0FBTyxRQUFRLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sT0FBTyxHQUFHLGtCQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDO0lBQzVELG9CQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNyQixNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFtQixDQUFDO0lBQ2xFLE1BQU0sRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFDLEdBQUcsU0FBUyxFQUFFLENBQUM7SUFDeEMsTUFBTSxPQUFPLENBQUM7QUFDaEIsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILHNDQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRTNCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztLQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZywgaW5pdFByb2Nlc3N9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0ICogYXMgX3J1bm5lciBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi9sb2ctY29uZmlnJztcbmltcG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcic7XG5cbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJyk7XG5cbnByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG5jb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbi5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4uYWN0aW9uKGFzeW5jIChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1xcblBsaW5rIHZlcnNpb246JywgcGsudmVyc2lvbik7XG5cbiAgaW5pdFByb2Nlc3MoKCkgPT4ge1xuICAgIHJldHVybiBzaHV0ZG93bigpO1xuICB9KTtcbiAgY29uc3Qgc2V0dGluZyA9IGluaXRDb25maWcocHJvZ3JhbS5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIGxvZ0NvbmZpZyhzZXR0aW5nKCkpO1xuICBjb25zdCB7cnVuU2VydmVyfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1ydW5uZXInKSBhcyB0eXBlb2YgX3J1bm5lcjtcbiAgY29uc3Qge3N0YXJ0ZWQsIHNodXRkb3dufSA9IHJ1blNlcnZlcigpO1xuICBhd2FpdCBzdGFydGVkO1xufSk7XG5cbndpdGhHbG9iYWxPcHRpb25zKHByb2dyYW0pO1xuXG5wcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuLmNhdGNoKGUgPT4ge1xuICBjb25zb2xlLmVycm9yKGUsIGUuc3RhY2spO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==