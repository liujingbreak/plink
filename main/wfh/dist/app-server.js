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
        const setting = yield index_1.initConfigAsync(program.opts());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQW9FO0FBRXBFLDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFFM0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFFekMsT0FBTyxDQUFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQztBQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO0tBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7S0FDdEIsTUFBTSxDQUFDLENBQU8sSUFBYyxFQUFFLEVBQUU7SUFDL0IsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTVDLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxDQUFzQixDQUFNLE9BQU8sRUFBQyxFQUFFO1FBQ3JFLG1CQUFXLENBQUMsR0FBRyxFQUFFO1lBQ2YsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sdUJBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDdkUsb0JBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sRUFBQyxTQUFTLEVBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQW1CLENBQUM7UUFDbEUsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNuQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFSCxzQ0FBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUzQixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7S0FDL0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMsIGluaXRDb25maWdBc3luYywgaW5pdFByb2Nlc3N9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0ICogYXMgX3J1bm5lciBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi9sb2ctY29uZmlnJztcbmltcG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcic7XG5cbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJyk7XG5cbnByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG5jb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbi5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4uYWN0aW9uKGFzeW5jIChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1xcblBsaW5rIHZlcnNpb246JywgcGsudmVyc2lvbik7XG5cbiAgY29uc3Qgc2VydmVyU3RhcnRlZCA9IG5ldyBQcm9taXNlPCgpID0+IFByb21pc2U8dm9pZD4+KGFzeW5jIHJlc29sdmUgPT4ge1xuICAgIGluaXRQcm9jZXNzKCgpID0+IHtcbiAgICAgIHJldHVybiBzZXJ2ZXJTdGFydGVkLnRoZW4oc2h1dGRvd24gPT4gc2h1dGRvd24oKSk7XG4gICAgfSk7XG4gICAgY29uc3Qgc2V0dGluZyA9IGF3YWl0IGluaXRDb25maWdBc3luYyhwcm9ncmFtLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICBsb2dDb25maWcoc2V0dGluZygpKTtcbiAgICBjb25zdCB7cnVuU2VydmVyfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1ydW5uZXInKSBhcyB0eXBlb2YgX3J1bm5lcjtcbiAgICBjb25zdCBzaHV0ZG93biA9IGF3YWl0IHJ1blNlcnZlcigpO1xuICAgIHJlc29sdmUoc2h1dGRvd24pO1xuICB9KTtcbn0pO1xuXG53aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxucHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndilcbi5jYXRjaChlID0+IHtcbiAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG4iXX0=