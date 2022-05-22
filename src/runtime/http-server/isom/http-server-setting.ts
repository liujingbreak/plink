import {config} from '@wfh/plink';

/**
 * Package setting type
 */
export interface HttpServerSetting {
  /** Deprecated */
  noHealthCheck: boolean;
  ssl: {
    enabled: boolean;
    key: string;
    cert: string;
    port: number;
    httpForward: boolean;
  };
  /** Additional host names (other than default host)
  * that HTTP/HTTPS server needs to listened */
  hostnames: string[];
  /** starts with multiple servers
  * if this property is provided, property "ssl" will be ignored */
  servers?: {
    ssl?: {
      key: string;
      cert: string;
    };
    port: number;
  }[];
}

/**
 * Plink runs this funtion to get package level setting value
 */
export function defaultSetting(): HttpServerSetting {
  const defaultValue: HttpServerSetting = {
    ssl: {
      enabled: false,
      key: 'key.pem',
      cert: 'cert.pem',
      port: 443,
      httpForward: true
    },
    noHealthCheck: false,
    hostnames: []
  };
  // Return settings based on command line option "dev"
  if (config().cliOptions?.dev) {
    defaultValue.noHealthCheck = true;
  }

  const env = config().cliOptions?.env;
  // Return settings based on command line option "env"
  if (env === 'local') {
    defaultValue.noHealthCheck = true;
  }

  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting(): HttpServerSetting {
  /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
  return config()['@wfh/http-server']!;
}
