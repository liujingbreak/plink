import { Observable } from 'rxjs';
export declare function replaceForHtml(content: string, resourcePath: string, callback: (text: string) => Observable<string>): Observable<string>;
