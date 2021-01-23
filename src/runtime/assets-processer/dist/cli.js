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
    const unzipCmd = program.command('unzip <zipFile> [destination_dir]')
        .description('Extract zip files to specific directory')
        // .requiredOption('-d,--dest <dir>', 'destination directory')
        .action((zipFile, destDir) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(defaultCfg);
        dist_1.prepareLazyNodeInjector();
        const { unZip } = yield Promise.resolve().then(() => __importStar(require('./cli-unzip')));
        yield unZip(zipFile, destDir);
    }));
    withGlobalOptions(unzipCmd);
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDhDQUFxRztBQUlyRyxNQUFNLFVBQVUsR0FBa0IsRUFBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUMsQ0FBQztBQUV6RCxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsRUFBRTtJQUMxRCxzQkFBc0I7SUFDdEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQztTQUN4RCxXQUFXLENBQUMsZ0NBQWdDLENBQUM7U0FDN0MsTUFBTSxDQUFDLHVCQUF1QixFQUFFLGVBQWUsQ0FBQztTQUNoRCxNQUFNLENBQUMsQ0FBTyxNQUFjLEVBQUUsV0FBbUIsRUFBRSxFQUFFO1FBQ3BELGlCQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkIsOEJBQXVCLEVBQUUsQ0FBQztRQUMxQixNQUFNLEVBQUMsTUFBTSxFQUFDLEdBQUcsd0RBQWEsaUJBQWlCLEdBQUMsQ0FBQztRQUNqRCxNQUFNLE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsNEJBQTRCO0lBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7U0FDaEMsV0FBVyxDQUFDLGdDQUFnQyxDQUFDO1NBQzdDLE1BQU0sQ0FBQyxDQUFNLElBQUksRUFBQyxFQUFFO1FBQ25CLE1BQU0sRUFBQyxPQUFPLEVBQUMsR0FBa0IsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCwwQkFBMEI7SUFDMUIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQztTQUNwRSxXQUFXLENBQUMseUNBQXlDLENBQUM7UUFDdkQsOERBQThEO1NBQzdELE1BQU0sQ0FBQyxDQUFPLE9BQWUsRUFBRSxPQUFnQixFQUFFLEVBQUU7UUFDbEQsaUJBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN2Qiw4QkFBdUIsRUFBRSxDQUFDO1FBQzFCLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyx3REFBYSxhQUFhLEdBQUMsQ0FBQztRQUM1QyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBwcmVwYXJlTGF6eU5vZGVJbmplY3RvciwgaW5pdENvbmZpZywgR2xvYmFsT3B0aW9uc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF91bnppcCBmcm9tICcuL2NsaS11bnppcCc7XG5cbmNvbnN0IGRlZmF1bHRDZmc6IEdsb2JhbE9wdGlvbnMgPSB7Y29uZmlnOiBbXSwgcHJvcDogW119O1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtLCB3aXRoR2xvYmFsT3B0aW9ucykgPT4ge1xuICAvLyAtLS0tLS0tIHppcCAtLS0tLS0tXG4gIGNvbnN0IGNtZCA9IHByb2dyYW0uY29tbWFuZCgnemlwIDxzcmNEaXI+IDxkZXN0WmlwRmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ0NyZWF0ZSB6aXAgZmlsZSBpbiA2NCB6aXAgbW9kZScpXG4gIC5vcHRpb24oJy1lLCAtLWV4Y2x1ZGUgPHJlZ2V4PicsICdleGNsdWRlIGZpbGVzJylcbiAgLmFjdGlvbihhc3luYyAoc3JjRGlyOiBzdHJpbmcsIGRlc3RaaXBGaWxlOiBzdHJpbmcpID0+IHtcbiAgICBpbml0Q29uZmlnKGRlZmF1bHRDZmcpO1xuICAgIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKCk7XG4gICAgY29uc3Qge3ppcERpcn0gPSBhd2FpdCBpbXBvcnQoJy4vcmVtb3RlLWRlcGxveScpO1xuICAgIGF3YWl0IHppcERpcihzcmNEaXIsIGRlc3RaaXBGaWxlLCBjbWQub3B0cygpLmV4Y2x1ZGUpO1xuICB9KTtcblxuICAvLyAtLS0tLS0tLSBsaXN0emlwIC0tLS0tLS0tXG4gIHByb2dyYW0uY29tbWFuZCgnbGlzdHppcCA8ZmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ0xpc3QgemlwIGZpbGUgY29udGVudCBhbmQgc2l6ZScpXG4gIC5hY3Rpb24oYXN5bmMgZmlsZSA9PiB7XG4gICAgY29uc3Qge2xpc3RaaXB9OiB0eXBlb2YgX3VuemlwID0gcmVxdWlyZSgnLi9jbGktdW56aXAnKTtcbiAgICBhd2FpdCBsaXN0WmlwKGZpbGUpO1xuICB9KTtcblxuICAvLyAtLS0tLS0tLSB1bnppcCAtLS0tLS0tLVxuICBjb25zdCB1bnppcENtZCA9IHByb2dyYW0uY29tbWFuZCgndW56aXAgPHppcEZpbGU+IFtkZXN0aW5hdGlvbl9kaXJdJylcbiAgLmRlc2NyaXB0aW9uKCdFeHRyYWN0IHppcCBmaWxlcyB0byBzcGVjaWZpYyBkaXJlY3RvcnknKVxuICAvLyAucmVxdWlyZWRPcHRpb24oJy1kLC0tZGVzdCA8ZGlyPicsICdkZXN0aW5hdGlvbiBkaXJlY3RvcnknKVxuICAuYWN0aW9uKGFzeW5jICh6aXBGaWxlOiBzdHJpbmcsIGRlc3REaXI/OiBzdHJpbmcpID0+IHtcbiAgICBpbml0Q29uZmlnKGRlZmF1bHRDZmcpO1xuICAgIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKCk7XG4gICAgY29uc3Qge3VuWmlwfSA9IGF3YWl0IGltcG9ydCgnLi9jbGktdW56aXAnKTtcbiAgICBhd2FpdCB1blppcCh6aXBGaWxlLCBkZXN0RGlyKTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHVuemlwQ21kKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==