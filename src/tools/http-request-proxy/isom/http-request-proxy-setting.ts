import {config, InjectorConfigHandler} from '@wfh/plink';

/**
 * Package setting type
 */
export interface HttpRequestProxySetting {
  trackRequestStream: boolean;
  proxies: {[path: string]: string};
  timeout: number;
  proxyTo? : string;

  npmRegistry: string;
}

/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export function defaultSetting(): HttpRequestProxySetting {
  const defaultValue: HttpRequestProxySetting = {
    trackRequestStream: false,
    proxies: {},
    timeout: 60000,
    npmRegistry: 'https://registry.npmjs.org/'
  };

  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
  return config()['@wfh/http-request-proxy']!;
}

const otherConfigures: InjectorConfigHandler = {
    /** For Node.js runtime, replace module in "require()" or import syntax */
    setupNodeInjector(factory, setting) {
      // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
    },
    /** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
    setupWebInjector(factory, setting) {
      // factory.fromPackage('@wfh/foobar').alias('moduleA', 'moduleB');
    }
};

export default otherConfigures;
