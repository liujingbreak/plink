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
program.parseAsync(process.argv)
    .catch(e => {
    console.error(e, e.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQW9FO0FBRXBFLDhEQUFxQztBQUVyQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUV6QyxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0FBRWpDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLEVBQUU7S0FDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQztLQUN0QixNQUFNLENBQUMsQ0FBTyxJQUFjLEVBQUUsRUFBRTtJQUMvQix1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFNUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQXNCLENBQU0sT0FBTyxFQUFDLEVBQUU7UUFDckUsbUJBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDZixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUN2RSxvQkFBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDckIsTUFBTSxFQUFDLFNBQVMsRUFBQyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBbUIsQ0FBQztRQUNsRSxNQUFNLFFBQVEsR0FBRyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztLQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZ0FzeW5jLCBpbml0UHJvY2Vzc30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuL2xvZy1jb25maWcnO1xuXG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ1BsaW5rIC0gc2VydmVyJztcblxuY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgpXG4uYXJndW1lbnRzKCdbYXJncy4uLl0nKVxuLmFjdGlvbihhc3luYyAoYXJnczogc3RyaW5nW10pID0+IHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdcXG5QbGluayB2ZXJzaW9uOicsIHBrLnZlcnNpb24pO1xuXG4gIGNvbnN0IHNlcnZlclN0YXJ0ZWQgPSBuZXcgUHJvbWlzZTwoKSA9PiBQcm9taXNlPHZvaWQ+Pihhc3luYyByZXNvbHZlID0+IHtcbiAgICBpbml0UHJvY2VzcygoKSA9PiB7XG4gICAgICByZXR1cm4gc2VydmVyU3RhcnRlZC50aGVuKHNodXRkb3duID0+IHNodXRkb3duKCkpO1xuICAgIH0pO1xuICAgIGNvbnN0IHNldHRpbmcgPSBhd2FpdCBpbml0Q29uZmlnQXN5bmMocHJvZ3JhbS5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgbG9nQ29uZmlnKHNldHRpbmcoKSk7XG4gICAgY29uc3Qge3J1blNlcnZlcn0gPSByZXF1aXJlKCcuL3BhY2thZ2UtcnVubmVyJykgYXMgdHlwZW9mIF9ydW5uZXI7XG4gICAgY29uc3Qgc2h1dGRvd24gPSBhd2FpdCBydW5TZXJ2ZXIoKTtcbiAgICByZXNvbHZlKHNodXRkb3duKTtcbiAgfSk7XG59KTtcblxucHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndilcbi5jYXRjaChlID0+IHtcbiAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG4iXX0=