"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unZip = exports.listZip = void 0;
const yauzl_1 = __importDefault(require("yauzl"));
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXVuemlwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLXVuemlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGtEQUEwQjtBQUMxQixrREFBMEI7QUFDMUIsMkJBQW1EO0FBQ25ELHVDQUFvQztBQUNwQyxnREFBd0I7QUFFakIsS0FBSyxVQUFVLE9BQU8sQ0FBQyxRQUFnQjtJQUM1QyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksT0FBTyxDQUE0QixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUN4RSxlQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNyRCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNqQjtZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7SUFDMUIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1FBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsUUFBUSxFQUFFLENBQUMsQ0FBQztLQUM1RDtJQUNELEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBa0IsRUFBRSxFQUFFO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTFCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsZUFBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekYsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2xCLENB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QUMsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQTFDRCxzQkEwQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeWF1emwgZnJvbSAneWF1emwnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IGNyZWF0ZVdyaXRlU3RyZWFtLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpcnBTeW5jfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3RaaXAoZmlsZU5hbWU6IHN0cmluZykge1xuICBjb25zdCB6aXAgPSBhd2FpdCBuZXcgUHJvbWlzZTx5YXV6bC5aaXBGaWxlIHwgdW5kZWZpbmVkPigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgeWF1emwub3BlbihmaWxlTmFtZSwge2xhenlFbnRyaWVzOiB0cnVlfSwgKGVyciwgemlwKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiByZWooZXJyKTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoemlwKTtcbiAgICB9KTtcbiAgfSk7XG4gIGNvbnN0IGxpc3Q6IHN0cmluZ1tdID0gW107XG4gIGlmICh6aXAgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgeWF1emwgY2FuIG5vdCBsaXN0IHppcCBmaWxlICR7ZmlsZU5hbWV9YCk7XG4gIH1cbiAgemlwLm9uKCdlbnRyeScsIChlbnRyeTogeWF1emwuRW50cnkpID0+IHtcbiAgICBsaXN0LnB1c2goZW50cnkuZmlsZU5hbWUpO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhlbnRyeS5maWxlTmFtZSArIGNoYWxrLmdyZWVuKGAgKHNpemU6ICR7ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA+PiAxMH0gS2IpYCkpO1xuICAgIHppcC5yZWFkRW50cnkoKTtcbiAgfSk7XG4gIHppcC5yZWFkRW50cnkoKTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8dHlwZW9mIGxpc3Q+KHJlc29sdmUgPT4ge1xuICAgIHppcC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZShsaXN0KSk7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdW5aaXAoZmlsZU5hbWU6IHN0cmluZywgdG9EaXIgPSBwcm9jZXNzLmN3ZCgpKSB7XG4gIGNvbnN0IHppcCA9IGF3YWl0IG5ldyBQcm9taXNlPHlhdXpsLlppcEZpbGUgfCB1bmRlZmluZWQ+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICB5YXV6bC5vcGVuKGZpbGVOYW1lLCB7bGF6eUVudHJpZXM6IHRydWV9LCAoZXJyLCB6aXApID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlaihlcnIpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZSh6aXApO1xuICAgIH0pO1xuICB9KTtcbiAgaWYgKHppcCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB5YXV6bCBjYW4gbm90IHVuemlwIHppcCBmaWxlICR7ZmlsZU5hbWV9YCk7XG4gIH1cbiAgemlwLm9uKCdlbnRyeScsIChlbnRyeTogeWF1emwuRW50cnkpID0+IHtcbiAgICBpZiAoZW50cnkuZmlsZU5hbWUuZW5kc1dpdGgoJy8nKSkge1xuICAgICAgLy8gc29tZSB6aXAgZm9ybWF0IGNvbnRhaW5zIGRpcmVjdG9yeVxuICAgICAgemlwLnJlYWRFbnRyeSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGVudHJ5LmZpbGVOYW1lICsgY2hhbGsuZ3JheShgIChzaXplOiAke2VudHJ5LnVuY29tcHJlc3NlZFNpemUgPj4gMTB9IEtiKWApKTtcblxuICAgIHppcC5vcGVuUmVhZFN0cmVhbShlbnRyeSwgKGVyciwgcmVhZFN0cmVhbSkgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGB5YXV6bCBpcyB1bmFibGUgdG8gZXh0cmFjdCBmaWxlICR7ZW50cnkuZmlsZU5hbWV9YCwgZXJyKTtcbiAgICAgICAgemlwLnJlYWRFbnRyeSgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZWFkU3RyZWFtIS5vbignZW5kJywgKCkgPT4ge3ppcC5yZWFkRW50cnkoKTt9KTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh0b0RpciwgZW50cnkuZmlsZU5hbWUpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGB3cml0ZSAke3RhcmdldH0gYCArIGNoYWxrLmdyYXkoYCAoc2l6ZTogJHtlbnRyeS51bmNvbXByZXNzZWRTaXplID4+IDEwfSBLYilgKSk7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUodGFyZ2V0KTtcbiAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKVxuICAgICAgICBta2RpcnBTeW5jKGRpcik7XG4gICAgICByZWFkU3RyZWFtIS5waXBlKGNyZWF0ZVdyaXRlU3RyZWFtKHRhcmdldCkpO1xuICAgIH0pO1xuICB9KTtcbiAgemlwLnJlYWRFbnRyeSgpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcbiAgICB6aXAub24oJ2VuZCcsICgpID0+IHJlc29sdmUoKSk7XG4gIH0pO1xufVxuIl19