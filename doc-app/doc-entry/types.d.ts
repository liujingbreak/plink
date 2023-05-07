declare module '*.md' {
  import {LoaderRecivedData} from '@wfh/doc-ui-common/isom/md-types';
  const html: string;
  const toc: LoaderRecivedData['toc'];
  export {html, toc};
}
