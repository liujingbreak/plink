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
const commander_1 = __importDefault(require("commander"));
// import * as tp from './cmd/types';
const bootstrap_server_1 = require("./utils/bootstrap-server");
const pk = require('../../package');
process.title = 'Plink - server';
const program = new commander_1.default.Command()
    .arguments('[args...]')
    .action((args) => __awaiter(void 0, void 0, void 0, function* () {
    // tslint:disable-next-line: no-console
    console.log('\nPlink version:', pk.version);
    const serverStarted = new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
        yield bootstrap_server_1.initConfigAsync(program.opts(), () => {
            return serverStarted.then(shutdown => shutdown());
        });
        const { runServer } = require('../lib/packageMgr');
        const shutdown = yield runServer(program.opts());
        resolve(shutdown);
    }));
}));
// program.version(version || pk.version, '-v, --vers', 'output the current version');
bootstrap_server_1.withGlobalOptions(program);
program.parseAsync(process.argv)
    .catch(e => {
    console.error(e, e.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwREFBa0M7QUFDbEMscUNBQXFDO0FBQ3JDLCtEQUEyRjtBQUMzRixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFNcEMsT0FBTyxDQUFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQztBQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO0tBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7S0FDdEIsTUFBTSxDQUFDLENBQU8sSUFBYyxFQUFFLEVBQUU7SUFDL0IsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTVDLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxDQUFzQixDQUFNLE9BQU8sRUFBQyxFQUFFO1FBQ3JFLE1BQU0sa0NBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFtQixFQUFFLEdBQUcsRUFBRTtZQUMxRCxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFDLFNBQVMsRUFBQyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBZSxDQUFDO1FBQy9ELE1BQU0sUUFBUSxHQUFHLE1BQU0sU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILHNGQUFzRjtBQUN0RixvQ0FBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUzQixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7S0FDL0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG4vLyBpbXBvcnQgKiBhcyB0cCBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2luaXRDb25maWdBc3luYywgd2l0aEdsb2JhbE9wdGlvbnMsIEdsb2JhbE9wdGlvbnN9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXNlcnZlcic7XG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UnKTtcblxuaW50ZXJmYWNlIFBhY2thZ2VNZ3Ige1xuICBydW5TZXJ2ZXI6IChhcmd2OiBhbnkpID0+IFByb21pc2U8KCkgPT4gUHJvbWlzZTx2b2lkPj47XG59XG5cbnByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG5jb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbi5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4uYWN0aW9uKGFzeW5jIChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1xcblBsaW5rIHZlcnNpb246JywgcGsudmVyc2lvbik7XG5cbiAgY29uc3Qgc2VydmVyU3RhcnRlZCA9IG5ldyBQcm9taXNlPCgpID0+IFByb21pc2U8dm9pZD4+KGFzeW5jIHJlc29sdmUgPT4ge1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhwcm9ncmFtLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zLCAoKSA9PiB7XG4gICAgICByZXR1cm4gc2VydmVyU3RhcnRlZC50aGVuKHNodXRkb3duID0+IHNodXRkb3duKCkpO1xuICAgIH0pO1xuXG4gICAgY29uc3Qge3J1blNlcnZlcn0gPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1ncicpIGFzIFBhY2thZ2VNZ3I7XG4gICAgY29uc3Qgc2h1dGRvd24gPSBhd2FpdCBydW5TZXJ2ZXIocHJvZ3JhbS5vcHRzKCkpO1xuICAgIHJlc29sdmUoc2h1dGRvd24pO1xuICB9KTtcbn0pO1xuXG4vLyBwcm9ncmFtLnZlcnNpb24odmVyc2lvbiB8fCBway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xud2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbSk7XG5cbnByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YpXG4uY2F0Y2goZSA9PiB7XG4gIGNvbnNvbGUuZXJyb3IoZSwgZS5zdGFjayk7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19