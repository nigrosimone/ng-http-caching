import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, finalize, share } from 'rxjs/operators';
import { NgHttpCachingService, NgHttpCachingHeadersList } from './ng-http-caching.service';


@Injectable()
export class NgHttpCachingInterceptorService implements HttpInterceptor {

  // eslint-disable-next-line no-unused-vars
  constructor(private readonly cacheService: NgHttpCachingService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // run garbage collector
    this.cacheService.runGc();

    // Don't cache if it's not cacheable
    if (!this.cacheService.isCacheable(req)) {
      return this.sendRequest(req, next);
    }

    // Checked if there is pending response for this request
    const cachedObservable: Observable<HttpEvent<any>> | undefined = this.cacheService.getFromQueue(req);
    if (cachedObservable) {
      // console.log('cachedObservable', req);
      return cachedObservable;
    }

    // Checked if there is cached response for this request
    const cachedResponse: HttpResponse<any> | undefined = this.cacheService.getFromCache(req);
    if (cachedResponse) {
      // console.log('cachedResponse', req);
      return of(cachedResponse.clone());
    }

    // If the request of going through for first time
    // then let the request proceed and cache the response
    // console.log('sendRequest', req);
    const shared = this.sendRequest(req, next).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cacheService.addToCache(req, event.clone());
        }
      }),
      finalize(() => {
        // delete pending request
        this.cacheService.deleteFromQueue(req);
      }),
      share()
    );

    // add pending request to queue for cache parallell request
    this.cacheService.addToQueue(req, shared);

    return shared;
  }

  /**
   * Send http request (next handler)
   */
  sendRequest(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let cloned: HttpRequest<any> = req.clone();
    // trim custom headers before send request
    NgHttpCachingHeadersList.forEach(ngHttpCachingHeaders => {
      if (cloned.headers.has(ngHttpCachingHeaders)) {
        cloned = cloned.clone({ headers: cloned.headers.delete(ngHttpCachingHeaders) });
      }
    });
    return next.handle(cloned);
  }
}
