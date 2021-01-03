"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
const dist_1 = require("@wfh/plink/wfh/dist");
const path_1 = __importDefault(require("path"));
const defaultCfg = { config: [], prop: [] };
const cliExt = (program, withGlobalOptions) => {
    // ------- zip -------
    const cmd = program.command('zip <srcDir> <destZipFile>')
        .description('Create zip file in 64 zip mode')
        .option('-e, --exclude <regex>', 'exclude files')
        .action((srcDir, destZipFile) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(defaultCfg);
        dist_1.prepareLazyNodeInjector();
        const { zipDir } = yield Promise.resolve().then(() => __importStar(require('./remote-deploy')));
        yield zipDir(srcDir, destZipFile, cmd.opts().exclude);
    }));
    // -------- listzip --------
    program.command('listzip <file>')
        .description('List zip file content and size')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        const { listZip } = require('./cli-unzip');
        yield listZip(file);
    }));
    // -------- unzip --------
    const unzipCmd = program.command('unzip <zipFileDirectory>')
        .description('Extract all zip files from specific directory')
        .requiredOption('-d,--dest <dir>', 'destination directory')
        .action((zipFileDirectory) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(defaultCfg);
        dist_1.prepareLazyNodeInjector();
        const { forkExtractExstingZip } = yield Promise.resolve().then(() => __importStar(require('@wfh/assets-processer/dist/fetch-remote')));
        yield forkExtractExstingZip(zipFileDirectory, path_1.default.resolve(unzipCmd.opts().dest), true);
    }));
    withGlobalOptions(unzipCmd);
};
exports.default = cliExt;

//# sourceMappingURL=cli.js.map
