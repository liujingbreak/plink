import { Observable } from 'rxjs';
export declare function symbolicLinkPackages(destDir: string): (src: Observable<string>) => Observable<[string, any]>;
