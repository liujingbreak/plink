"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliExt = (program) => {
    // ------- zip -------
    const cmd = program.command('zip <srcDir> <destZipFile>')
        .description('Create zip file in 64 zip mode')
        .option('-e, --exclude <regex>', 'exclude files')
        .action(async (srcDir, destZipFile) => {
        // prepareLazyNodeInjector();
        const { zipDir } = await Promise.resolve().then(() => __importStar(require('./remote-deploy')));
        await zipDir(srcDir, destZipFile, cmd.opts().exclude);
    });
    // -------- listzip --------
    program.command('listzip <file>')
        .description('List zip file content and size')
        .action(async (file) => {
        const { listZip } = require('./cli-unzip');
        await listZip(file);
    });
    // -------- unzip --------
    program.command('unzip <zipFile> [destination_dir]')
        .description('Extract zip files to specific directory')
        // .requiredOption('-d,--dest <dir>', 'destination directory')
        .action(async (zipFile, destDir) => {
        // prepareLazyNodeInjector();
        const { unZip } = await Promise.resolve().then(() => __importStar(require('./cli-unzip')));
        await unZip(zipFile, destDir);
    });
};
exports.default = cliExt;
//# sourceMappingURL=cli.js.map