declare module '*.md' {
  import {LoaderRecivedData} from '@wfh/doc-ui-common/isom/md-types';
  const data: LoaderRecivedData;
  export default data;
  global {
    interface ImportMeta {
      webpackHot: any;
    }
  }
}
