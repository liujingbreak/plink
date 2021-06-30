/// <reference path="../types.d.ts" />

import {dispatcher} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import intro from '!file-loader!@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/achitecture/intro.md';
import sample from '!file-loader!@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/achitecture/sample.md';

export default function() {
  dispatcher.registerFiles({
    intro,
    sample
  });
}
