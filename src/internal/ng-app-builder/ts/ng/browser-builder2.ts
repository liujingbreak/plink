import {BrowserBuilder} from '@angular-devkit/build-angular';
import {BuilderContext } from '@angular-devkit/architect';
import {WebpackBuilder} from './webpack-builders';

export default class Builder extends BrowserBuilder {
	protected createWebpackBuilder(context: BuilderContext): WebpackBuilder {
		return new WebpackBuilder(context);
	}
}
