import './cli-analyse-worker-init';
import {initConfig} from '../utils/bootstrap-process';
import {initInjectorForNodePackages} from '../package-runner';
import {createService} from './cli-analyse-service';

initConfig(JSON.parse(process.env.PLINK_CLI_OPTS!));
initInjectorForNodePackages();

createService();

