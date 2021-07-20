"use strict";
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
exports.listZip = void 0;
const yauzl_1 = __importDefault(require("yauzl"));
const chalk_1 = __importDefault(require("chalk"));
function listZip(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const zip = yield new Promise((resolve, rej) => {
            yauzl_1.default.open(fileName, { lazyEntries: true }, (err, zip) => {
                if (err) {
                    return rej(err);
                }
                resolve(zip);
            });
        });
        const list = [];
        if (zip == null) {
            throw new Error(`yauzl can not create zip file ${fileName}`);
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
    });
}
exports.listZip = listZip;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXVuemlwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLXVuemlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtEQUEwQjtBQUMxQixrREFBMEI7QUFFMUIsU0FBc0IsT0FBTyxDQUFDLFFBQWdCOztRQUM1QyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksT0FBTyxDQUE0QixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN4RSxlQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDckQsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2pCO2dCQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7UUFDMUIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUM5RDtRQUNELEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBa0IsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTFCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsZUFBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDekYsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWhCLE9BQU8sSUFBSSxPQUFPLENBQWMsT0FBTyxDQUFDLEVBQUU7WUFDeEMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQUE7QUF6QkQsMEJBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhdXpsIGZyb20gJ3lhdXpsJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsaXN0WmlwKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgemlwID0gYXdhaXQgbmV3IFByb21pc2U8eWF1emwuWmlwRmlsZSB8IHVuZGVmaW5lZD4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgIHlhdXpsLm9wZW4oZmlsZU5hbWUsIHtsYXp5RW50cmllczogdHJ1ZX0sIChlcnIsIHppcCkgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gcmVqKGVycik7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHppcCk7XG4gICAgfSk7XG4gIH0pO1xuICBjb25zdCBsaXN0OiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoemlwID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHlhdXpsIGNhbiBub3QgY3JlYXRlIHppcCBmaWxlICR7ZmlsZU5hbWV9YCk7XG4gIH1cbiAgemlwLm9uKCdlbnRyeScsIChlbnRyeTogeWF1emwuRW50cnkpID0+IHtcbiAgICBsaXN0LnB1c2goZW50cnkuZmlsZU5hbWUpO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhlbnRyeS5maWxlTmFtZSArIGNoYWxrLmdyZWVuKGAgKHNpemU6ICR7ZW50cnkudW5jb21wcmVzc2VkU2l6ZSA+PiAxMH0gS2IpYCkpO1xuICAgIHppcC5yZWFkRW50cnkoKTtcbiAgfSk7XG4gIHppcC5yZWFkRW50cnkoKTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8dHlwZW9mIGxpc3Q+KHJlc29sdmUgPT4ge1xuICAgIHppcC5vbignZW5kJywgKCkgPT4gcmVzb2x2ZShsaXN0KSk7XG4gIH0pO1xufVxuIl19