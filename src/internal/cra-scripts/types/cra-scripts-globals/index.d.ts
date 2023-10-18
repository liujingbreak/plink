import {ExtensionContext} from '@wfh/plink/wfh/dist/globals';

declare global {
	var __api: ExtensionContext; // & ExpressAppApi;
	const __plink: ExtensionContext;
}
