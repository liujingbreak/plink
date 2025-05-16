"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./cli-analyse-worker-init");
const bootstrap_process_1 = require("../utils/bootstrap-process");
const package_runner_1 = require("../package-runner");
const cli_analyse_service_1 = require("./cli-analyse-service");
(0, bootstrap_process_1.initConfig)(JSON.parse(process.env.PLINK_CLI_OPTS));
(0, package_runner_1.initInjectorForNodePackages)();
(0, cli_analyse_service_1.createService)();
//# sourceMappingURL=cli-analyse-worker.js.map