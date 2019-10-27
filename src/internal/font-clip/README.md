# Web font file clip tool

Base on fonteditor-core.

- Convert font file format from ttf, eof, otf, svg to woff, woff2
- Clip and minimize font file to only contain specific character subset, compress to woff2 format

```ts
import {clipToWoff2} from 'font-clip';

async function main() {
  const src = Path.resolve('node_modules/font-clip/example-font/PingFang Regular.ttf');
  await clipToWoff2(src, Path.resolve('gen'), '部分中文字'));
  // Output to file gen/PingFang Regular.woff2
}
```
