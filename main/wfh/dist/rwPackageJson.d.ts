import { Observable } from 'rxjs';
export declare function symbolicLinkPackages(destDir: string): (src: Observable<{
    name: string;
    realPath: string;
}>) => Observable<void>;
