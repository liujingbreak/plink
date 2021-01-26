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
const pk = require('../../package');
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
        yield index_1.initConfigAsync(program.opts());
        const { runServer } = require('./package-runner');
        const shutdown = yield runServer();
        resolve(shutdown);
    }));
}));
// program.version(version || pk.version, '-v, --vers', 'output the current version');
index_1.withGlobalOptions(program);
program.parseAsync(process.argv)
    .catch(e => {
    console.error(e, e.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQXVGO0FBR3ZGLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUVwQyxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0FBRWpDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLEVBQUU7S0FDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQztLQUN0QixNQUFNLENBQUMsQ0FBTyxJQUFjLEVBQUUsRUFBRTtJQUMvQix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFNUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQXNCLENBQU0sT0FBTyxFQUFDLEVBQUU7UUFDckUsbUJBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDZixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSx1QkFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUV2RCxNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFtQixDQUFDO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDbkMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUgsc0ZBQXNGO0FBQ3RGLHlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRTNCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztLQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7d2l0aEdsb2JhbE9wdGlvbnMsIEdsb2JhbE9wdGlvbnMsIGluaXRDb25maWdBc3luYywgaW5pdFByb2Nlc3N9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0ICogYXMgX3J1bm5lciBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcblxuY29uc3QgcGsgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlJyk7XG5cbnByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG5jb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbi5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4uYWN0aW9uKGFzeW5jIChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1xcblBsaW5rIHZlcnNpb246JywgcGsudmVyc2lvbik7XG5cbiAgY29uc3Qgc2VydmVyU3RhcnRlZCA9IG5ldyBQcm9taXNlPCgpID0+IFByb21pc2U8dm9pZD4+KGFzeW5jIHJlc29sdmUgPT4ge1xuICAgIGluaXRQcm9jZXNzKCgpID0+IHtcbiAgICAgIHJldHVybiBzZXJ2ZXJTdGFydGVkLnRoZW4oc2h1dGRvd24gPT4gc2h1dGRvd24oKSk7XG4gICAgfSk7XG4gICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKHByb2dyYW0ub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuXG4gICAgY29uc3Qge3J1blNlcnZlcn0gPSByZXF1aXJlKCcuL3BhY2thZ2UtcnVubmVyJykgYXMgdHlwZW9mIF9ydW5uZXI7XG4gICAgY29uc3Qgc2h1dGRvd24gPSBhd2FpdCBydW5TZXJ2ZXIoKTtcbiAgICByZXNvbHZlKHNodXRkb3duKTtcbiAgfSk7XG59KTtcblxuLy8gcHJvZ3JhbS52ZXJzaW9uKHZlcnNpb24gfHwgcGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbndpdGhHbG9iYWxPcHRpb25zKHByb2dyYW0pO1xuXG5wcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuLmNhdGNoKGUgPT4ge1xuICBjb25zb2xlLmVycm9yKGUsIGUuc3RhY2spO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==