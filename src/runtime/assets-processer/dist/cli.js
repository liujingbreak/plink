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
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = require("@wfh/plink/wfh/dist");
const defaultCfg = { config: [], prop: [] };
const cliExt = (program) => {
    // ------- zip -------
    const cmd = program.command('zip <srcDir> <destZipFile>')
        .description('Create zip file in 64 zip mode')
        .option('-e, --exclude <regex>', 'exclude files')
        .action((srcDir, destZipFile) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(defaultCfg);
        // prepareLazyNodeInjector();
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
    program.command('unzip <zipFile> [destination_dir]')
        .description('Extract zip files to specific directory')
        // .requiredOption('-d,--dest <dir>', 'destination directory')
        .action((zipFile, destDir) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(defaultCfg);
        // prepareLazyNodeInjector();
        const { unZip } = yield Promise.resolve().then(() => __importStar(require('./cli-unzip')));
        yield unZip(zipFile, destDir);
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhDQUE0RTtBQUk1RSxNQUFNLFVBQVUsR0FBa0IsRUFBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUMsQ0FBQztBQUV6RCxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxzQkFBc0I7SUFDdEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQztTQUN4RCxXQUFXLENBQUMsZ0NBQWdDLENBQUM7U0FDN0MsTUFBTSxDQUFDLHVCQUF1QixFQUFFLGVBQWUsQ0FBQztTQUNoRCxNQUFNLENBQUMsQ0FBTyxNQUFjLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1FBQ3BELGlCQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkIsNkJBQTZCO1FBQzdCLE1BQU0sRUFBQyxNQUFNLEVBQUMsR0FBRyx3REFBYSxpQkFBaUIsR0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCw0QkFBNEI7SUFDNUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztTQUNoQyxXQUFXLENBQUMsZ0NBQWdDLENBQUM7U0FDN0MsTUFBTSxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUU7UUFDbkIsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFrQixPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDeEQsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILDBCQUEwQjtJQUMxQixPQUFPLENBQUMsT0FBTyxDQUFDLG1DQUFtQyxDQUFDO1NBQ25ELFdBQVcsQ0FBQyx5Q0FBeUMsQ0FBQztRQUN2RCw4REFBOEQ7U0FDN0QsTUFBTSxDQUFDLENBQU8sT0FBZSxFQUFFLE9BQWdCLEVBQUUsRUFBRTtRQUNsRCxpQkFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZCLDZCQUE2QjtRQUM3QixNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsd0RBQWEsYUFBYSxHQUFDLENBQUM7UUFDNUMsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2hDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbiwgaW5pdENvbmZpZywgR2xvYmFsT3B0aW9uc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF91bnppcCBmcm9tICcuL2NsaS11bnppcCc7XG5cbmNvbnN0IGRlZmF1bHRDZmc6IEdsb2JhbE9wdGlvbnMgPSB7Y29uZmlnOiBbXSwgcHJvcDogW119O1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIC8vIC0tLS0tLS0gemlwIC0tLS0tLS1cbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCd6aXAgPHNyY0Rpcj4gPGRlc3RaaXBGaWxlPicpXG4gIC5kZXNjcmlwdGlvbignQ3JlYXRlIHppcCBmaWxlIGluIDY0IHppcCBtb2RlJylcbiAgLm9wdGlvbignLWUsIC0tZXhjbHVkZSA8cmVnZXg+JywgJ2V4Y2x1ZGUgZmlsZXMnKVxuICAuYWN0aW9uKGFzeW5jIChzcmNEaXI6IHN0cmluZywgZGVzdFppcEZpbGU6IHN0cmluZykgPT4ge1xuICAgIGluaXRDb25maWcoZGVmYXVsdENmZyk7XG4gICAgLy8gcHJlcGFyZUxhenlOb2RlSW5qZWN0b3IoKTtcbiAgICBjb25zdCB7emlwRGlyfSA9IGF3YWl0IGltcG9ydCgnLi9yZW1vdGUtZGVwbG95Jyk7XG4gICAgYXdhaXQgemlwRGlyKHNyY0RpciwgZGVzdFppcEZpbGUsIGNtZC5vcHRzKCkuZXhjbHVkZSk7XG4gIH0pO1xuXG4gIC8vIC0tLS0tLS0tIGxpc3R6aXAgLS0tLS0tLS1cbiAgcHJvZ3JhbS5jb21tYW5kKCdsaXN0emlwIDxmaWxlPicpXG4gIC5kZXNjcmlwdGlvbignTGlzdCB6aXAgZmlsZSBjb250ZW50IGFuZCBzaXplJylcbiAgLmFjdGlvbihhc3luYyBmaWxlID0+IHtcbiAgICBjb25zdCB7bGlzdFppcH06IHR5cGVvZiBfdW56aXAgPSByZXF1aXJlKCcuL2NsaS11bnppcCcpO1xuICAgIGF3YWl0IGxpc3RaaXAoZmlsZSk7XG4gIH0pO1xuXG4gIC8vIC0tLS0tLS0tIHVuemlwIC0tLS0tLS0tXG4gIHByb2dyYW0uY29tbWFuZCgndW56aXAgPHppcEZpbGU+IFtkZXN0aW5hdGlvbl9kaXJdJylcbiAgLmRlc2NyaXB0aW9uKCdFeHRyYWN0IHppcCBmaWxlcyB0byBzcGVjaWZpYyBkaXJlY3RvcnknKVxuICAvLyAucmVxdWlyZWRPcHRpb24oJy1kLC0tZGVzdCA8ZGlyPicsICdkZXN0aW5hdGlvbiBkaXJlY3RvcnknKVxuICAuYWN0aW9uKGFzeW5jICh6aXBGaWxlOiBzdHJpbmcsIGRlc3REaXI/OiBzdHJpbmcpID0+IHtcbiAgICBpbml0Q29uZmlnKGRlZmF1bHRDZmcpO1xuICAgIC8vIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKCk7XG4gICAgY29uc3Qge3VuWmlwfSA9IGF3YWl0IGltcG9ydCgnLi9jbGktdW56aXAnKTtcbiAgICBhd2FpdCB1blppcCh6aXBGaWxlLCBkZXN0RGlyKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=