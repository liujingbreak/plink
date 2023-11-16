import {LoaderDefinitionFunction} from 'webpack';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import _ from 'lodash';
import {markdownToHtml} from './markdown-util';
// require('node:inspector').open(9222, 'localhost', true);

const markdownLoader: LoaderDefinitionFunction = function(source, sourceMap) {
  const cb = this.async();
  const importCode = [] as string[];
  let imgIdx = 0;

  // const logger = this.getLogger('markdown-loader');
  // debugger;

  markdownToHtml(source, this.resourcePath,
    imgSrc => {
      const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
      importCode.push(`import imgSrc${imgIdx} from '${url}';`);
      return Promise.resolve('imgSrc' + (imgIdx++));
    })
    .pipe(
      op.take(1),
      op.map(result => {
        cb(null,
          importCode.join('\n') + '\nconst html = ' + result.content + ';\nlet toc = ' + JSON.stringify(result.toc) + ';\nlet m = {html, toc};\nexport default m;\n', sourceMap);
      }),
      op.catchError(err => {
        cb(err, JSON.stringify(err), sourceMap);
        return rx.EMPTY;
      })
    )
    .subscribe();
};

export default markdownLoader;

