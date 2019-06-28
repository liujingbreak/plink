import { Injectable } from '@angular/core';
import {HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS} from '@angular/common/http';
import {Observable} from 'rxjs';
import {isPlatformServer} from '@dr-core/ng-app-builder/src/app-utils';
import { parse as parseUrl } from 'url';

@Injectable({
  providedIn: 'root'
})
export class PrerenderHttpInterceptorService implements HttpInterceptor {

  constructor() { }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let newReq = req;
    if (isPlatformServer() && !/^http[s]:\/\//.test(req.url)) {
      newReq = req.clone({url: 'http://localhost:' + __api.config().port + parseUrl(req.url).path});
    }
    return next.handle(newReq);
  }
}

export const httpInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: PrerenderHttpInterceptorService, multi: true }
];
