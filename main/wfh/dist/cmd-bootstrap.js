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
require("./node-path");
const node_version_check_1 = __importDefault(require("./utils/node-version-check"));
const startTime = new Date().getTime();
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
        (yield Promise.resolve().then(() => __importStar(require('./cmd/cli')))).drcpCommand(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQix1QkFBcUI7QUFDckIsb0ZBQW1EO0FBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDdkMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFTLEdBQUc7SUFDaEMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pCO0FBQ0gsQ0FBQyxDQUFDLENBQUM7QUFFSCxDQUFDLFNBQWUsR0FBRzs7UUFDakIsTUFBTSw0QkFBUyxFQUFFLENBQUM7UUFDbEIsQ0FBQyx3REFBYSxXQUFXLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSAqL1xuaW1wb3J0ICcuL25vZGUtcGF0aCc7XG5pbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcbmNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xucHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCdSZWNpZXZlIFNJR0lOVCwgYnllLicpO1xuICBwcm9jZXNzLmV4aXQoMCk7XG59KTtcbnByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcbiAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgIGNvbnNvbGUubG9nKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcbiAgICBwcm9jZXNzLmV4aXQoMCk7XG4gIH1cbn0pO1xuXG4oYXN5bmMgZnVuY3Rpb24gcnVuKCkge1xuICBhd2FpdCBjaGVja05vZGUoKTtcbiAgKGF3YWl0IGltcG9ydCgnLi9jbWQvY2xpJykpLmRyY3BDb21tYW5kKHN0YXJ0VGltZSk7XG59KSgpLmNhdGNoKGVyciA9PiB7XG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19