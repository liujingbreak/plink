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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJQSxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxzQkFBc0I7SUFDdEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQztTQUN4RCxXQUFXLENBQUMsZ0NBQWdDLENBQUM7U0FDN0MsTUFBTSxDQUFDLHVCQUF1QixFQUFFLGVBQWUsQ0FBQztTQUNoRCxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQWMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFDcEQsNkJBQTZCO1FBQzdCLE1BQU0sRUFBQyxNQUFNLEVBQUMsR0FBRyx3REFBYSxpQkFBaUIsR0FBQyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDO0lBRUgsNEJBQTRCO0lBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7U0FDaEMsV0FBVyxDQUFDLGdDQUFnQyxDQUFDO1NBQzdDLE1BQU0sQ0FBQyxLQUFLLEVBQUMsSUFBSSxFQUFDLEVBQUU7UUFDbkIsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQWtCLENBQUM7UUFDMUQsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCwwQkFBMEI7SUFDMUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQztTQUNuRCxXQUFXLENBQUMseUNBQXlDLENBQUM7UUFDdkQsOERBQThEO1NBQzdELE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBZSxFQUFFLE9BQWdCLEVBQUUsRUFBRTtRQUNsRCw2QkFBNkI7UUFDN0IsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLHdEQUFhLGFBQWEsR0FBQyxDQUFDO1FBQzVDLE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNoQyxDQUFDLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgX3VuemlwIGZyb20gJy4vY2xpLXVuemlwJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICAvLyAtLS0tLS0tIHppcCAtLS0tLS0tXG4gIGNvbnN0IGNtZCA9IHByb2dyYW0uY29tbWFuZCgnemlwIDxzcmNEaXI+IDxkZXN0WmlwRmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ0NyZWF0ZSB6aXAgZmlsZSBpbiA2NCB6aXAgbW9kZScpXG4gIC5vcHRpb24oJy1lLCAtLWV4Y2x1ZGUgPHJlZ2V4PicsICdleGNsdWRlIGZpbGVzJylcbiAgLmFjdGlvbihhc3luYyAoc3JjRGlyOiBzdHJpbmcsIGRlc3RaaXBGaWxlOiBzdHJpbmcpID0+IHtcbiAgICAvLyBwcmVwYXJlTGF6eU5vZGVJbmplY3RvcigpO1xuICAgIGNvbnN0IHt6aXBEaXJ9ID0gYXdhaXQgaW1wb3J0KCcuL3JlbW90ZS1kZXBsb3knKTtcbiAgICBhd2FpdCB6aXBEaXIoc3JjRGlyLCBkZXN0WmlwRmlsZSwgY21kLm9wdHMoKS5leGNsdWRlKTtcbiAgfSk7XG5cbiAgLy8gLS0tLS0tLS0gbGlzdHppcCAtLS0tLS0tLVxuICBwcm9ncmFtLmNvbW1hbmQoJ2xpc3R6aXAgPGZpbGU+JylcbiAgLmRlc2NyaXB0aW9uKCdMaXN0IHppcCBmaWxlIGNvbnRlbnQgYW5kIHNpemUnKVxuICAuYWN0aW9uKGFzeW5jIGZpbGUgPT4ge1xuICAgIGNvbnN0IHtsaXN0WmlwfSA9IHJlcXVpcmUoJy4vY2xpLXVuemlwJykgYXMgdHlwZW9mIF91bnppcDtcbiAgICBhd2FpdCBsaXN0WmlwKGZpbGUpO1xuICB9KTtcblxuICAvLyAtLS0tLS0tLSB1bnppcCAtLS0tLS0tLVxuICBwcm9ncmFtLmNvbW1hbmQoJ3VuemlwIDx6aXBGaWxlPiBbZGVzdGluYXRpb25fZGlyXScpXG4gIC5kZXNjcmlwdGlvbignRXh0cmFjdCB6aXAgZmlsZXMgdG8gc3BlY2lmaWMgZGlyZWN0b3J5JylcbiAgLy8gLnJlcXVpcmVkT3B0aW9uKCctZCwtLWRlc3QgPGRpcj4nLCAnZGVzdGluYXRpb24gZGlyZWN0b3J5JylcbiAgLmFjdGlvbihhc3luYyAoemlwRmlsZTogc3RyaW5nLCBkZXN0RGlyPzogc3RyaW5nKSA9PiB7XG4gICAgLy8gcHJlcGFyZUxhenlOb2RlSW5qZWN0b3IoKTtcbiAgICBjb25zdCB7dW5aaXB9ID0gYXdhaXQgaW1wb3J0KCcuL2NsaS11bnppcCcpO1xuICAgIGF3YWl0IHVuWmlwKHppcEZpbGUsIGRlc3REaXIpO1xuICB9KTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19