"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const common_1 = require("./common");
const injector_setup_1 = require("./injector-setup");
const mem_stats_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
const { tsconfigFile, reportDir, config, ngOptions, packageInfo, deployUrl, baseHref, drcpBuilderOptions } = worker_threads_1.workerData;
// tslint:disable: no-console
// console.log(workerData);
mem_stats_1.default();
common_1.initCli(drcpBuilderOptions)
    .then((drcpConfig) => {
    return injector_setup_1.injectorSetup(packageInfo, drcpBuilderOptions.drcpArgs, deployUrl, baseHref);
}).then(() => {
    const create = require('./change-tsconfig').createTsConfig;
    const content = create(tsconfigFile, ngOptions, config, packageInfo, reportDir);
    worker_threads_1.parentPort.postMessage({ log: mem_stats_1.default() });
    worker_threads_1.parentPort.postMessage({ result: content });
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtdHNjb25maWctd29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsbURBQXNEO0FBRXRELHFDQUFxRDtBQUNyRCxxREFBK0M7QUFHL0Msb0ZBQTJEO0FBYTNELE1BQU0sRUFDSixZQUFZLEVBQ1osU0FBUyxFQUNULE1BQU0sRUFDTixTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsRUFDVCxRQUFRLEVBQ1Isa0JBQWtCLEVBQ25CLEdBQUcsMkJBQWtCLENBQUM7QUFFdkIsNkJBQTZCO0FBQzdCLDJCQUEyQjtBQUMzQixtQkFBUSxFQUFFLENBQUM7QUFDWCxnQkFBTyxDQUFDLGtCQUFrQixDQUFDO0tBQzFCLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO0lBQ25CLE9BQU8sOEJBQWEsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN0RixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ1gsTUFBTSxNQUFNLEdBQTBCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQztJQUNsRixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRWhGLDJCQUFXLENBQUMsV0FBVyxDQUFDLEVBQUMsR0FBRyxFQUFFLG1CQUFRLEVBQUUsRUFBQyxDQUFDLENBQUM7SUFDM0MsMkJBQVcsQ0FBQyxXQUFXLENBQUMsRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L25nL2NoYW5nZS10c2NvbmZpZy13b3JrZXIuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
