declare module 'webpack-bundle-analyzer' {
  import {WebpackPluginInstance} from 'webpack';

  export interface BundleAnalyzerPlugin extends WebpackPluginInstance {
    apply: any;
  }

  export const BundleAnalyzerPlugin: new (opts: {
      analyzerMode: 'server' | 'static' | 'json' | 'disabled';
      generateStatsFile?: boolean;
      statsFilename?: string;
    }) => BundleAnalyzerPlugin;
  // export class BundleAnalyzerPlugin implements WebpackPluginInstance {
  //   constructor (opts: {
  //     analyzerMode: 'server' | 'static' | 'json' | 'disabled';
  //     generateStatsFile?: boolean;
  //   });
  // }
}
