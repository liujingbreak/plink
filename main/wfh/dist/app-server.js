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
        const { runServer } = require('../lib/packageMgr/index');
        const shutdown = yield runServer(program.opts());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQXVGO0FBR3ZGLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUVwQyxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0FBRWpDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLEVBQUU7S0FDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQztLQUN0QixNQUFNLENBQUMsQ0FBTyxJQUFjLEVBQUUsRUFBRTtJQUMvQix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFNUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQXNCLENBQU0sT0FBTyxFQUFDLEVBQUU7UUFDckUsbUJBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDZixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSx1QkFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUV2RCxNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFrQixDQUFDO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLE1BQU0sU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILHNGQUFzRjtBQUN0Rix5QkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUzQixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7S0FDL0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge3dpdGhHbG9iYWxPcHRpb25zLCBHbG9iYWxPcHRpb25zLCBpbml0Q29uZmlnQXN5bmMsIGluaXRQcm9jZXNzfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9saWIvcGFja2FnZU1nci9pbmRleCc7XG5cbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZScpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ1BsaW5rIC0gc2VydmVyJztcblxuY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgpXG4uYXJndW1lbnRzKCdbYXJncy4uLl0nKVxuLmFjdGlvbihhc3luYyAoYXJnczogc3RyaW5nW10pID0+IHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdcXG5QbGluayB2ZXJzaW9uOicsIHBrLnZlcnNpb24pO1xuXG4gIGNvbnN0IHNlcnZlclN0YXJ0ZWQgPSBuZXcgUHJvbWlzZTwoKSA9PiBQcm9taXNlPHZvaWQ+Pihhc3luYyByZXNvbHZlID0+IHtcbiAgICBpbml0UHJvY2VzcygoKSA9PiB7XG4gICAgICByZXR1cm4gc2VydmVyU3RhcnRlZC50aGVuKHNodXRkb3duID0+IHNodXRkb3duKCkpO1xuICAgIH0pO1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhwcm9ncmFtLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcblxuICAgIGNvbnN0IHtydW5TZXJ2ZXJ9ID0gcmVxdWlyZSgnLi4vbGliL3BhY2thZ2VNZ3IvaW5kZXgnKSBhcyB0eXBlb2YgcGtnTWdyO1xuICAgIGNvbnN0IHNodXRkb3duID0gYXdhaXQgcnVuU2VydmVyKHByb2dyYW0ub3B0cygpKTtcbiAgICByZXNvbHZlKHNodXRkb3duKTtcbiAgfSk7XG59KTtcblxuLy8gcHJvZ3JhbS52ZXJzaW9uKHZlcnNpb24gfHwgcGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbndpdGhHbG9iYWxPcHRpb25zKHByb2dyYW0pO1xuXG5wcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuLmNhdGNoKGUgPT4ge1xuICBjb25zb2xlLmVycm9yKGUsIGUuc3RhY2spO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==