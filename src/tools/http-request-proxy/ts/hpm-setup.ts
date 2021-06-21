import {setupHttpProxy} from '@wfh/assets-processer/dist/utils';
import {config} from '@wfh/plink';

export function npmRegistryProxy() {
  setupHttpProxy('/npm-registry', config()['@wfh/http-request-proxy'].npmRegistry);
}
