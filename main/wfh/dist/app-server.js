"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const index_1 = require("./index");
const log_config_1 = __importDefault(require("./log-config"));
const override_commander_1 = require("./cmd/override-commander");
const { version } = require('../../package.json');
process.title = 'Plink - server';
let shutdown;
const program = new commander_1.default.Command()
    .arguments('[args...]')
    .action((args) => {
    // eslint-disable-next-line no-console
    console.log('\nPlink version:', version);
    const setting = index_1.initConfig(program.opts());
    log_config_1.default(setting());
    const { runServer } = require('./package-runner');
    shutdown = runServer().shutdown;
    // await started;
});
if (process.send) {
    // current process is forked
    index_1.initAsChildProcess(true, () => shutdown());
}
else {
    index_1.initProcess(() => {
        return shutdown();
    });
}
override_commander_1.withGlobalOptions(program);
program.parseAsync(process.argv)
    .catch((e) => {
    console.error(e, e.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQW1GO0FBRW5GLDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFFM0QsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQztBQUVyRSxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0FBRWpDLElBQUksUUFBNEIsQ0FBQztBQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO0tBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7S0FDdEIsTUFBTSxDQUFDLENBQUMsSUFBYyxFQUFFLEVBQUU7SUFDekIsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDekMsTUFBTSxPQUFPLEdBQUcsa0JBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7SUFDNUQsb0JBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3JCLE1BQU0sRUFBQyxTQUFTLEVBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQW1CLENBQUM7SUFDbEUsUUFBUSxHQUFHLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztJQUNoQyxpQkFBaUI7QUFDbkIsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7SUFDaEIsNEJBQTRCO0lBQzVCLDBCQUFrQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0NBQzVDO0tBQU07SUFDTCxtQkFBVyxDQUFDLEdBQUcsRUFBRTtRQUNmLE9BQU8sUUFBUSxFQUFFLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7Q0FDSjtBQUVELHNDQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRTNCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztLQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFRLEVBQUUsRUFBRTtJQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZywgaW5pdFByb2Nlc3MsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuL2xvZy1jb25maWcnO1xuaW1wb3J0IHt3aXRoR2xvYmFsT3B0aW9uc30gZnJvbSAnLi9jbWQvb3ZlcnJpZGUtY29tbWFuZGVyJztcblxuY29uc3Qge3ZlcnNpb259ID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG5cbnByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG5sZXQgc2h1dGRvd246ICgpID0+IFByb21pc2U8YW55PjtcblxuY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgpXG4uYXJndW1lbnRzKCdbYXJncy4uLl0nKVxuLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1xcblBsaW5rIHZlcnNpb246JywgdmVyc2lvbik7XG4gIGNvbnN0IHNldHRpbmcgPSBpbml0Q29uZmlnKHByb2dyYW0ub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICBsb2dDb25maWcoc2V0dGluZygpKTtcbiAgY29uc3Qge3J1blNlcnZlcn0gPSByZXF1aXJlKCcuL3BhY2thZ2UtcnVubmVyJykgYXMgdHlwZW9mIF9ydW5uZXI7XG4gIHNodXRkb3duID0gcnVuU2VydmVyKCkuc2h1dGRvd247XG4gIC8vIGF3YWl0IHN0YXJ0ZWQ7XG59KTtcblxuaWYgKHByb2Nlc3Muc2VuZCkge1xuICAvLyBjdXJyZW50IHByb2Nlc3MgaXMgZm9ya2VkXG4gIGluaXRBc0NoaWxkUHJvY2Vzcyh0cnVlLCAoKSA9PiBzaHV0ZG93bigpKTtcbn0gZWxzZSB7XG4gIGluaXRQcm9jZXNzKCgpID0+IHtcbiAgICByZXR1cm4gc2h1dGRvd24oKTtcbiAgfSk7XG59XG5cbndpdGhHbG9iYWxPcHRpb25zKHByb2dyYW0pO1xuXG5wcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuLmNhdGNoKChlOiBFcnJvcikgPT4ge1xuICBjb25zb2xlLmVycm9yKGUsIGUuc3RhY2spO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==