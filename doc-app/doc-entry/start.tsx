/// <reference path="react-app-env.d.ts" />
import 'react-app-polyfill/ie11';
import './index.scss';
import {renderDom} from './main/MainComponent';
// import reportWebVitals from './reportWebVitals';
const container = document.getElementById('root')!;
renderDom(container);
// reportWebVitals();
