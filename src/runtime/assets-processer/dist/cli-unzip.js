"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unZip = exports.listZip = void 0;
const tslib_1 = require("tslib");
const yauzl_1 = tslib_1.__importDefault(require("yauzl"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = tslib_1.__importDefault(require("path"));
async function listZip(fileName) {
    const zip = await new Promise((resolve, rej) => {
        yauzl_1.default.open(fileName, { lazyEntries: true }, (err, zip) => {
            if (err) {
                return rej(err);
            }
            resolve(zip);
        });
    });
    const list = [];
    if (zip == null) {
        throw new Error(`yauzl can not list zip file ${fileName}`);
    }
    zip.on('entry', (entry) => {
        list.push(entry.fileName);
        // eslint-disable-next-line no-console
        console.log(entry.fileName + chalk_1.default.green(` (size: ${entry.uncompressedSize >> 10} Kb)`));
        zip.readEntry();
    });
    zip.readEntry();
    return new Promise(resolve => {
        zip.on('end', () => resolve(list));
    });
}
exports.listZip = listZip;
async function unZip(fileName, toDir = process.cwd()) {
    const zip = await new Promise((resolve, rej) => {
        yauzl_1.default.open(fileName, { lazyEntries: true }, (err, zip) => {
            if (err) {
                return rej(err);
            }
            resolve(zip);
        });
    });
    if (zip == null) {
        throw new Error(`yauzl can not unzip zip file ${fileName}`);
    }
    zip.on('entry', (entry) => {
        if (entry.fileName.endsWith('/')) {
            // some zip format contains directory
            zip.readEntry();
            return;
        }
        // eslint-disable-next-line no-console
        console.log(entry.fileName + chalk_1.default.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));
        zip.openReadStream(entry, (err, readStream) => {
            if (err) {
                console.error(`yauzl is unable to extract file ${entry.fileName}`, err);
                zip.readEntry();
                return;
            }
            readStream.on('end', () => { zip.readEntry(); });
            const target = path_1.default.resolve(toDir, entry.fileName);
            // eslint-disable-next-line no-console
            console.log(`write ${target} ` + chalk_1.default.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));
            const dir = path_1.default.dirname(target);
            if (!(0, fs_1.existsSync)(dir))
                (0, fs_extra_1.mkdirpSync)(dir);
            readStream.pipe((0, fs_1.createWriteStream)(target));
        });
    });
    zip.readEntry();
    return new Promise(resolve => {
        zip.on('end', () => resolve());
    });
}
exports.unZip = unZip;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXVuemlwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLXVuemlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSwwREFBMEI7QUFDMUIsMERBQTBCO0FBQzFCLDJCQUFtRDtBQUNuRCx1Q0FBb0M7QUFDcEMsd0RBQXdCO0FBRWpCLEtBQUssVUFBVSxPQUFPLENBQUMsUUFBZ0I7SUFDNUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBNEIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDeEUsZUFBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBQyxXQUFXLEVBQUUsSUFBSSxFQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDckQsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDakI7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO0lBQzFCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtRQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLFFBQVEsRUFBRSxDQUFDLENBQUM7S0FDNUQ7SUFDRCxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQWtCLEVBQUUsRUFBRTtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUxQixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLGVBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLENBQUMsZ0JBQWdCLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNsQixDQUFD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LEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUExQ0Qsc0JBMENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhdXpsIGZyb20gJ3lhdXpsJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBjcmVhdGVXcml0ZVN0cmVhbSwgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7bWtkaXJwU3luY30gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0WmlwKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgemlwID0gYXdhaXQgbmV3IFByb21pc2U8eWF1emwuWmlwRmlsZSB8IHVuZGVmaW5lZD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgIHlhdXpsLm9wZW4oZmlsZU5hbWUsIHtsYXp5RW50cmllczogdHJ1ZX0sIChlcnIsIHppcCkgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gcmVqKGVycik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHppcCk7XG4gICAgfSk7XG4gIH0pO1xuICBjb25zdCBsaXN0OiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoemlwID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHlhdXpsIGNhbiBub3QgbGlzdCB6aXAgZmlsZSAke2ZpbGVOYW1lfWApO1xuICB9XG4gIHppcC5vbignZW50cnknLCAoZW50cnk6IHlhdXpsLkVudHJ5KSA9PiB7XG4gICAgbGlzdC5wdXNoKGVudHJ5LmZpbGVOYW1lKTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coZW50cnkuZmlsZU5hbWUgKyBjaGFsay5ncmVlbihgIChzaXplOiAke2VudHJ5LnVuY29tcHJlc3NlZFNpemUgPj4gMTB9IEtiKWApKTtcbiAgICB6aXAucmVhZEVudHJ5KCk7XG4gIH0pO1xuICB6aXAucmVhZEVudHJ5KCk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPHR5cGVvZiBsaXN0PihyZXNvbHZlID0+IHtcbiAgICB6aXAub24oJ2VuZCcsICgpID0+IHJlc29sdmUobGlzdCkpO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVuWmlwKGZpbGVOYW1lOiBzdHJpbmcsIHRvRGlyID0gcHJvY2Vzcy5jd2QoKSkge1xuICBjb25zdCB6aXAgPSBhd2FpdCBuZXcgUHJvbWlzZTx5YXV6bC5aaXBGaWxlIHwgdW5kZWZpbmVkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgeWF1emwub3BlbihmaWxlTmFtZSwge2xhenlFbnRyaWVzOiB0cnVlfSwgKGVyciwgemlwKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiByZWooZXJyKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoemlwKTtcbiAgICB9KTtcbiAgfSk7XG4gIGlmICh6aXAgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgeWF1emwgY2FuIG5vdCB1bnppcCB6aXAgZmlsZSAke2ZpbGVOYW1lfWApO1xuICB9XG4gIHppcC5vbignZW50cnknLCAoZW50cnk6IHlhdXpsLkVudHJ5KSA9PiB7XG4gICAgaWYgKGVudHJ5LmZpbGVOYW1lLmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIC8vIHNvbWUgemlwIGZvcm1hdCBjb250YWlucyBkaXJlY3RvcnlcbiAgICAgIHppcC5yZWFkRW50cnkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhlbnRyeS5maWxlTmFtZSArIGNoYWxrLmdyYXkoYCAoc2l6ZTogJHtlbnRyeS51bmNvbXByZXNzZWRTaXplID4+IDEwfSBLYilgKSk7XG5cbiAgICB6aXAub3BlblJlYWRTdHJlYW0oZW50cnksIChlcnIsIHJlYWRTdHJlYW0pID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgeWF1emwgaXMgdW5hYmxlIHRvIGV4dHJhY3QgZmlsZSAke2VudHJ5LmZpbGVOYW1lfWAsIGVycik7XG4gICAgICAgIHppcC5yZWFkRW50cnkoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcmVhZFN0cmVhbSEub24oJ2VuZCcsICgpID0+IHt6aXAucmVhZEVudHJ5KCk7fSk7XG4gICAgICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUodG9EaXIsIGVudHJ5LmZpbGVOYW1lKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgd3JpdGUgJHt0YXJnZXR9IGAgKyBjaGFsay5ncmF5KGAgKHNpemU6ICR7ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA+PiAxMH0gS2IpYCkpO1xuICAgICAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKHRhcmdldCk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSlcbiAgICAgICAgbWtkaXJwU3luYyhkaXIpO1xuICAgICAgcmVhZFN0cmVhbSEucGlwZShjcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXQpKTtcbiAgICB9KTtcbiAgfSk7XG4gIHppcC5yZWFkRW50cnkoKTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XG4gICAgemlwLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKCkpO1xuICB9KTtcbn1cbiJdfQ==