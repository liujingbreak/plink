import 'react-app-polyfill/ie11';
import './index.css';
import {renderDom} from './main/MainComponent';
// import reportWebVitals from './reportWebVitals';
const container = document.getElementById('root')!;

renderDom(container);
// reportWebVitals();
