"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
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
//# sourceMappingURL=ts-node-setup.js.map