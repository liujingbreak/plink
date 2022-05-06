"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const ts_node_1 = require("ts-node");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const misc_1 = require("./misc");
function register() {
    const internalTscfgFile = path_1.default.resolve(__dirname, '../../tsconfig-base.json');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { compilerOptions } = typescript_1.default.readConfigFile(internalTscfgFile, file => fs_1.default.readFileSync(file, 'utf8')).config;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    (0, package_list_helper_1.setTsCompilerOptForNodePath)(process.cwd(), './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: misc_1.plinkEnv.workDir
    });
    compilerOptions.module = 'commonjs';
    compilerOptions.noUnusedLocals = false;
    compilerOptions.diagnostics = true;
    compilerOptions.declaration = false;
    delete compilerOptions.rootDir;
    // console.log(compilerOptions);
    (0, ts_node_1.register)({
        typeCheck: true,
        compilerOptions,
        skipIgnore: true,
        compiler: require.resolve('typescript'),
        /**
         * Important!! prevent ts-node looking for tsconfig.json from current working directory
         */
        skipProject: true,
        transformers: {
            before: [
                context => (src) => {
                    // log.info('before ts-node compiles:', src.fileName);
                    // console.log(src.text);
                    return src;
                }
            ],
            after: [
                context => (src) => {
                    // log.info('ts-node compiles:', src.fileName);
                    // console.log(src.text);
                    return src;
                }
            ]
        }
    });
}
try {
    register();
}
catch (e) {
    console.error(e);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtbm9kZS1zZXR1cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL3RzLW5vZGUtc2V0dXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLDREQUE0QjtBQUM1QixxQ0FBbUQ7QUFDbkQsNEVBQStFO0FBQy9FLGlDQUFnQztBQUVoQyxTQUFTLFFBQVE7SUFDZixNQUFNLGlCQUFpQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFFOUUsbUVBQW1FO0lBQ25FLE1BQU0sRUFBQyxlQUFlLEVBQUMsR0FBRyxvQkFBRSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFDM0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FDdEMsQ0FBQyxNQUFNLENBQUM7SUFDVCwrR0FBK0c7SUFFL0csSUFBQSxpREFBMkIsRUFBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRTtRQUNoRSxlQUFlLEVBQUUsSUFBSTtRQUNyQixZQUFZLEVBQUUsZUFBUSxDQUFDLE9BQU87S0FDL0IsQ0FBQyxDQUFDO0lBRUgsZUFBZSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7SUFDcEMsZUFBZSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7SUFDdkMsZUFBZSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDbkMsZUFBZSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDcEMsT0FBTyxlQUFlLENBQUMsT0FBTyxDQUFDO0lBRS9CLGdDQUFnQztJQUNoQyxJQUFBLGtCQUFjLEVBQUM7UUFDYixTQUFTLEVBQUUsSUFBSTtRQUNmLGVBQWU7UUFDZixVQUFVLEVBQUUsSUFBSTtRQUNoQixRQUFRLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDdkM7O1dBRUc7UUFDSCxXQUFXLEVBQUUsSUFBSTtRQUNqQixZQUFZLEVBQUU7WUFDWixNQUFNLEVBQUU7Z0JBQ04sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO29CQUNqQixzREFBc0Q7b0JBQ3RELHlCQUF5QjtvQkFDekIsT0FBTyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQzthQUNGO1lBQ0QsS0FBSyxFQUFFO2dCQUNMLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtvQkFDakIsK0NBQStDO29CQUMvQyx5QkFBeUI7b0JBQ3pCLE9BQU8sR0FBRyxDQUFDO2dCQUNiLENBQUM7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELElBQUk7SUFDRixRQUFRLEVBQUUsQ0FBQztDQUNaO0FBQUMsT0FBTyxDQUFDLEVBQUU7SUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtyZWdpc3RlciBhcyByZWdpc3RlclRzTm9kZX0gZnJvbSAndHMtbm9kZSc7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL21pc2MnO1xuXG5mdW5jdGlvbiByZWdpc3RlcigpIHtcbiAgY29uc3QgaW50ZXJuYWxUc2NmZ0ZpbGUgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICBjb25zdCB7Y29tcGlsZXJPcHRpb25zfSA9IHRzLnJlYWRDb25maWdGaWxlKGludGVybmFsVHNjZmdGaWxlLFxuICAgIGZpbGUgPT4gZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JylcbiAgKS5jb25maWc7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuXG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCAnLi8nLCBjb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiBwbGlua0Vudi53b3JrRGlyXG4gIH0pO1xuXG4gIGNvbXBpbGVyT3B0aW9ucy5tb2R1bGUgPSAnY29tbW9uanMnO1xuICBjb21waWxlck9wdGlvbnMubm9VbnVzZWRMb2NhbHMgPSBmYWxzZTtcbiAgY29tcGlsZXJPcHRpb25zLmRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgY29tcGlsZXJPcHRpb25zLmRlY2xhcmF0aW9uID0gZmFsc2U7XG4gIGRlbGV0ZSBjb21waWxlck9wdGlvbnMucm9vdERpcjtcblxuICAvLyBjb25zb2xlLmxvZyhjb21waWxlck9wdGlvbnMpO1xuICByZWdpc3RlclRzTm9kZSh7XG4gICAgdHlwZUNoZWNrOiB0cnVlLFxuICAgIGNvbXBpbGVyT3B0aW9ucyxcbiAgICBza2lwSWdub3JlOiB0cnVlLCAvLyBpbXBvcnRhbnQsIGJ5IFwiZmFsc2VcIiB3aWxsIGlnbm9yZSBmaWxlcyBhcmUgdW5kZXIgbm9kZV9tb2R1bGVzXG4gICAgY29tcGlsZXI6IHJlcXVpcmUucmVzb2x2ZSgndHlwZXNjcmlwdCcpLFxuICAgIC8qKlxuICAgICAqIEltcG9ydGFudCEhIHByZXZlbnQgdHMtbm9kZSBsb29raW5nIGZvciB0c2NvbmZpZy5qc29uIGZyb20gY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAqL1xuICAgIHNraXBQcm9qZWN0OiB0cnVlLFxuICAgIHRyYW5zZm9ybWVyczoge1xuICAgICAgYmVmb3JlOiBbXG4gICAgICAgIGNvbnRleHQgPT4gKHNyYykgPT4ge1xuICAgICAgICAgIC8vIGxvZy5pbmZvKCdiZWZvcmUgdHMtbm9kZSBjb21waWxlczonLCBzcmMuZmlsZU5hbWUpO1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHNyYy50ZXh0KTtcbiAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgYWZ0ZXI6IFtcbiAgICAgICAgY29udGV4dCA9PiAoc3JjKSA9PiB7XG4gICAgICAgICAgLy8gbG9nLmluZm8oJ3RzLW5vZGUgY29tcGlsZXM6Jywgc3JjLmZpbGVOYW1lKTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzcmMudGV4dCk7XG4gICAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgfSk7XG59XG5cbnRyeSB7XG4gIHJlZ2lzdGVyKCk7XG59IGNhdGNoIChlKSB7XG4gIGNvbnNvbGUuZXJyb3IoZSk7XG59XG5cbiJdfQ==