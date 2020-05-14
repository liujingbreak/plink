"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const yauzl_1 = tslib_1.__importDefault(require("yauzl"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
function listZip(fileName) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const zip = yield new Promise((resolve, rej) => {
            yauzl_1.default.open(fileName, { lazyEntries: true }, (err, zip) => {
                if (err) {
                    return rej(err);
                }
                resolve(zip);
            });
        });
        const list = [];
        zip.on('entry', (entry) => {
            list.push(entry.fileName);
            // tslint:disable-next-line: no-console
            console.log(entry.fileName + chalk_1.default.green(` (size: ${entry.uncompressedSize >> 10} Kb)`));
            zip.readEntry();
        });
        zip.readEntry();
        return new Promise(resolve => {
            zip.on('end', () => resolve(list));
        });
    });
}
exports.listZip = listZip;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLXVuemlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDBEQUEwQjtBQUMxQiwwREFBMEI7QUFFMUIsU0FBc0IsT0FBTyxDQUFDLFFBQWdCOztRQUM1QyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksT0FBTyxDQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUM1RCxlQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDckQsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2pCO2dCQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7UUFDMUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFrQixFQUFFLEVBQUU7WUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFMUIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxlQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN6RixHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFaEIsT0FBTyxJQUFJLE9BQU8sQ0FBYyxPQUFPLENBQUMsRUFBRTtZQUN4QyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQXRCRCwwQkFzQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L2NsaS11bnppcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB5YXV6bCBmcm9tICd5YXV6bCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbGlzdFppcChmaWxlTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHppcCA9IGF3YWl0IG5ldyBQcm9taXNlPHlhdXpsLlppcEZpbGU+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICB5YXV6bC5vcGVuKGZpbGVOYW1lLCB7bGF6eUVudHJpZXM6IHRydWV9LCAoZXJyLCB6aXApID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh6aXApO1xuICAgIH0pO1xuICB9KTtcbiAgY29uc3QgbGlzdDogc3RyaW5nW10gPSBbXTtcbiAgemlwLm9uKCdlbnRyeScsIChlbnRyeTogeWF1emwuRW50cnkpID0+IHtcbiAgICBsaXN0LnB1c2goZW50cnkuZmlsZU5hbWUpO1xuXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coZW50cnkuZmlsZU5hbWUgKyBjaGFsay5ncmVlbihgIChzaXplOiAke2VudHJ5LnVuY29tcHJlc3NlZFNpemUgPj4gMTB9IEtiKWApKTtcbiAgICB6aXAucmVhZEVudHJ5KCk7XG4gIH0pO1xuICB6aXAucmVhZEVudHJ5KCk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPHR5cGVvZiBsaXN0PihyZXNvbHZlID0+IHtcbiAgICB6aXAub24oJ2VuZCcsICgpID0+IHJlc29sdmUobGlzdCkpO1xuICB9KTtcbn1cbiJdfQ==
