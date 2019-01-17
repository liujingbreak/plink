"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Path = tslib_1.__importStar(require("path"));
const NM_DIR = Path.sep + 'node_modules' + Path.sep;
// You don't have to export the function as default. You can also have more than one rule factory
// per file.
function drcpApp( /*options: any*/) {
    return (tree, _context) => {
        tree.visit((path /*, entry: FileEntry*/) => {
            if (path.startsWith(NM_DIR))
                return;
            // console.log(path);
        });
        return tree;
    };
}
exports.drcpApp = drcpApp;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9zY2hlbWF0aWNzL2RyY3AtYXBwLXNjaGVtYXRpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtREFBNkI7QUFFN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUNwRCxpR0FBaUc7QUFDakcsWUFBWTtBQUNaLFNBQWdCLE9BQU8sRUFBQyxnQkFBZ0I7SUFDdEMsT0FBTyxDQUFDLElBQVUsRUFBRSxRQUEwQixFQUFFLEVBQUU7UUFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQVksQ0FBQSxzQkFBc0IsRUFBRSxFQUFFO1lBQ2pELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQzFCLE9BQU87WUFDUixxQkFBcUI7UUFDdEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQztJQUNYLENBQUMsQ0FBQztBQUNKLENBQUM7QUFURCwwQkFTQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9zY2hlbWF0aWNzL2RyY3AtYXBwLXNjaGVtYXRpYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJ1bGUsIFNjaGVtYXRpY0NvbnRleHQsIFRyZWUvKiwgRmlsZUVudHJ5Ki8gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBOTV9ESVIgPSBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnICsgUGF0aC5zZXA7XG4vLyBZb3UgZG9uJ3QgaGF2ZSB0byBleHBvcnQgdGhlIGZ1bmN0aW9uIGFzIGRlZmF1bHQuIFlvdSBjYW4gYWxzbyBoYXZlIG1vcmUgdGhhbiBvbmUgcnVsZSBmYWN0b3J5XG4vLyBwZXIgZmlsZS5cbmV4cG9ydCBmdW5jdGlvbiBkcmNwQXBwKC8qb3B0aW9uczogYW55Ki8pOiBSdWxlIHtcbiAgcmV0dXJuICh0cmVlOiBUcmVlLCBfY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuXHR0cmVlLnZpc2l0KChwYXRoOiBzdHJpbmcvKiwgZW50cnk6IEZpbGVFbnRyeSovKSA9PiB7XG5cdFx0aWYgKHBhdGguc3RhcnRzV2l0aChOTV9ESVIpKVxuXHRcdFx0cmV0dXJuO1xuXHRcdC8vIGNvbnNvbGUubG9nKHBhdGgpO1xuXHR9KTtcblx0cmV0dXJuIHRyZWU7XG4gIH07XG59XG4iXX0=
