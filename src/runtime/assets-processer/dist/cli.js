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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUlBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLHNCQUFzQjtJQUN0QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDO1NBQ3hELFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQztTQUM3QyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsZUFBZSxDQUFDO1NBQ2hELE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBYyxFQUFFLFdBQW1CLEVBQUUsRUFBRTtRQUNwRCw2QkFBNkI7UUFDN0IsTUFBTSxFQUFDLE1BQU0sRUFBQyxHQUFHLHdEQUFhLGlCQUFpQixHQUFDLENBQUM7UUFDakQsTUFBTSxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFFSCw0QkFBNEI7SUFDNUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztTQUNoQyxXQUFXLENBQUMsZ0NBQWdDLENBQUM7U0FDN0MsTUFBTSxDQUFDLEtBQUssRUFBQyxJQUFJLEVBQUMsRUFBRTtRQUNuQixNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBa0IsQ0FBQztRQUMxRCxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDLENBQUMsQ0FBQztJQUVILDBCQUEwQjtJQUMxQixPQUFPLENBQUMsT0FBTyxDQUFDLG1DQUFtQyxDQUFDO1NBQ25ELFdBQVcsQ0FBQyx5Q0FBeUMsQ0FBQztRQUN2RCw4REFBOEQ7U0FDN0QsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFlLEVBQUUsT0FBZ0IsRUFBRSxFQUFFO1FBQ2xELDZCQUE2QjtRQUM3QixNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsd0RBQWEsYUFBYSxHQUFDLENBQUM7UUFDNUMsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2hDLENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb259IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfdW56aXAgZnJvbSAnLi9jbGktdW56aXAnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIC8vIC0tLS0tLS0gemlwIC0tLS0tLS1cbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCd6aXAgPHNyY0Rpcj4gPGRlc3RaaXBGaWxlPicpXG4gIC5kZXNjcmlwdGlvbignQ3JlYXRlIHppcCBmaWxlIGluIDY0IHppcCBtb2RlJylcbiAgLm9wdGlvbignLWUsIC0tZXhjbHVkZSA8cmVnZXg+JywgJ2V4Y2x1ZGUgZmlsZXMnKVxuICAuYWN0aW9uKGFzeW5jIChzcmNEaXI6IHN0cmluZywgZGVzdFppcEZpbGU6IHN0cmluZykgPT4ge1xuICAgIC8vIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKCk7XG4gICAgY29uc3Qge3ppcERpcn0gPSBhd2FpdCBpbXBvcnQoJy4vcmVtb3RlLWRlcGxveScpO1xuICAgIGF3YWl0IHppcERpcihzcmNEaXIsIGRlc3RaaXBGaWxlLCBjbWQub3B0cygpLmV4Y2x1ZGUpO1xuICB9KTtcblxuICAvLyAtLS0tLS0tLSBsaXN0emlwIC0tLS0tLS0tXG4gIHByb2dyYW0uY29tbWFuZCgnbGlzdHppcCA8ZmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ0xpc3QgemlwIGZpbGUgY29udGVudCBhbmQgc2l6ZScpXG4gIC5hY3Rpb24oYXN5bmMgZmlsZSA9PiB7XG4gICAgY29uc3Qge2xpc3RaaXB9ID0gcmVxdWlyZSgnLi9jbGktdW56aXAnKSBhcyB0eXBlb2YgX3VuemlwO1xuICAgIGF3YWl0IGxpc3RaaXAoZmlsZSk7XG4gIH0pO1xuXG4gIC8vIC0tLS0tLS0tIHVuemlwIC0tLS0tLS0tXG4gIHByb2dyYW0uY29tbWFuZCgndW56aXAgPHppcEZpbGU+IFtkZXN0aW5hdGlvbl9kaXJdJylcbiAgLmRlc2NyaXB0aW9uKCdFeHRyYWN0IHppcCBmaWxlcyB0byBzcGVjaWZpYyBkaXJlY3RvcnknKVxuICAvLyAucmVxdWlyZWRPcHRpb24oJy1kLC0tZGVzdCA8ZGlyPicsICdkZXN0aW5hdGlvbiBkaXJlY3RvcnknKVxuICAuYWN0aW9uKGFzeW5jICh6aXBGaWxlOiBzdHJpbmcsIGRlc3REaXI/OiBzdHJpbmcpID0+IHtcbiAgICAvLyBwcmVwYXJlTGF6eU5vZGVJbmplY3RvcigpO1xuICAgIGNvbnN0IHt1blppcH0gPSBhd2FpdCBpbXBvcnQoJy4vY2xpLXVuemlwJyk7XG4gICAgYXdhaXQgdW5aaXAoemlwRmlsZSwgZGVzdERpcik7XG4gIH0pO1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=