#!/usr/bin/env node
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:no-console */
require('source-map-support/register');
const node_version_check_1 = __importDefault(require("./utils/node-version-check"));
const node_path_1 = __importDefault(require("./node-path"));
process.on('SIGINT', function () {
    console.log('Recieve SIGINT, bye.');
    process.exit(0);
});
process.on('message', function (msg) {
    if (msg === 'shutdown') {
        console.log('Recieve shutdown message from PM2, bye.');
        process.exit(0);
    }
});
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield node_version_check_1.default();
        const startTime = new Date().getTime();
        yield processCmd();
        function processCmd() {
            return __awaiter(this, void 0, void 0, function* () {
                node_path_1.default();
                (yield Promise.resolve().then(() => __importStar(require('./cmd/cli')))).drcpCommand(startTime);
            });
        }
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQixPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUN2QyxvRkFBbUQ7QUFDbkQsNERBQXdDO0FBRXhDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO0lBQ2hDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtRQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQjtBQUNILENBQUMsQ0FBQyxDQUFDO0FBRUgsQ0FBQyxTQUFlLEdBQUc7O1FBQ2pCLE1BQU0sNEJBQVMsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkMsTUFBTSxVQUFVLEVBQUUsQ0FBQztRQUduQixTQUFlLFVBQVU7O2dCQUN2QixtQkFBYSxFQUFFLENBQUM7Z0JBQ2hCLENBQUMsd0RBQWEsV0FBVyxHQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckQsQ0FBQztTQUFBO0lBQ0gsQ0FBQztDQUFBLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtJQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgKi9cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuaW1wb3J0IGNoZWNrTm9kZSBmcm9tICcuL3V0aWxzL25vZGUtdmVyc2lvbi1jaGVjayc7XG5pbXBvcnQgc2V0dXBOb2RlUGF0aCBmcm9tICcuL25vZGUtcGF0aCc7XG5cbnByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnUmVjaWV2ZSBTSUdJTlQsIGJ5ZS4nKTtcbiAgcHJvY2Vzcy5leGl0KDApO1xufSk7XG5wcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gIGlmIChtc2cgPT09ICdzaHV0ZG93bicpIHtcbiAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICB9XG59KTtcblxuKGFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcbiAgYXdhaXQgY2hlY2tOb2RlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICBhd2FpdCBwcm9jZXNzQ21kKCk7XG5cblxuICBhc3luYyBmdW5jdGlvbiBwcm9jZXNzQ21kKCkge1xuICAgIHNldHVwTm9kZVBhdGgoKTtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NtZC9jbGknKSkuZHJjcENvbW1hbmQoc3RhcnRUaW1lKTtcbiAgfVxufSkoKS5jYXRjaChlcnIgPT4ge1xuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==