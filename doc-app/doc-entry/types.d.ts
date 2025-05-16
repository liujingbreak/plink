declare module '*.md' {
  import {LoaderRecivedData} from '@wfh/markdown-base/isom/types';
  const data: LoaderRecivedData;
  export default data;
  global {
    interface ImportMeta {
      webpackHot: any;
    }
  }
}
