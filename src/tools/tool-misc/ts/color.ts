/* tslint:disable no-console */
// import Color = require('color-js/color');
import api from '__api';
import * as _ from 'lodash';

export function fillPalettes() {
	const input: Array<{[hue: string]: string}> = api.config.get([api.packageName, 'fillPalettes']);
	console.log(input);
	for (const colors of input) {
		fillPalette(colors);
	}
}

const colorMapkey = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900',
	'A100', 'A200', 'A400', 'A700'];
function fillPalette(colorMap: {[hue: string]: string}) {
	const missingKeys = colorMapkey.filter(key => !_.has(colorMap, key));
	console.log(missingKeys);

	// const colors = (input.colors as string[]).map(color => Color(color));
	// console.log(colors.map(col => col.lightenByRatio(0.15).toCSS()));
}
