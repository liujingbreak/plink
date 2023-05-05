/// <reference path="react-app-env.d.ts" />
/// <reference path="types.d.ts" />
import 'react-app-polyfill/ie11';
import './index.scss';
// import sample from './sample.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!./docs/zh/architecture/sample.md';
// console.log(sample);
import {renderDom} from './main/MainComponent';
import reportWebVitals from './reportWebVitals';
const container = document.getElementById('root')!;
renderDom(container);
reportWebVitals();

