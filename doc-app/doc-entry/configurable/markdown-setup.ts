/// <reference path="../types.d.ts"/>

import {dispatcher} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import intro from '@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/architecture/intro.md';
// import sample from '@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/architecture/sample.md';
// import design1 from '@wfh/doc-ui-common/dist/markdown-loader!@wfh/assets-processer/ts/proxy-cache/design.md';

export default function() {
  dispatcher.registerFiles({
    intro
    // sample,
    // design1
  });
}
