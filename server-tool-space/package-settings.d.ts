import {AssetsProcesserSetting as AssetsProcesser} from '@wfh/assets-processer/isom/assets-processer-setting';
import {HttpServerSetting as HttpServer} from '@wfh/http-server/isom/http-server-setting';
import {HttpRequestProxySetting as HttpRequestProxy} from '@wfh/http-request-proxy/isom/http-request-proxy-setting';
import {ExpressAppSetting as ExpressApp} from '@wfh/express-app/isom/express-app-setting';
export interface PackagesConfig {
  '@wfh/assets-processer': AssetsProcesser;
  '@wfh/http-server': HttpServer;
  '@wfh/http-request-proxy': HttpRequestProxy;
  '@wfh/express-app': ExpressApp;
}
