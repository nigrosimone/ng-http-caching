import { HttpEvent, HttpEventType, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { asyncScheduler, Observable, of, scheduled } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { NgHttpCachingService, NgHttpCachingHeadersList } from './ng-http-caching.service';

@Injectable()
export class NgHttpCachingInterceptorService implements HttpInterceptor {

  private readonly cacheService: NgHttpCachingService = inject(NgHttpCachingService);

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
      // console.log('cachedObservable',cachedObservable);
      return cachedObservable;
    }

    // Checked if there is cached response for this request
    const cachedResponse: HttpResponse<any> | undefined = this.cacheService.getFromCache(req);
    if (cachedResponse) {
      // console.log('cachedResponse');
      return scheduled(of(cachedResponse.clone()), asyncScheduler);
    }

    // If the request of going through for first time
    // then let the request proceed and cache the response
    // console.log('sendRequest', req);
    const shared = this.sendRequest(req, next).pipe(
      tap(event => {
        if (event.type === HttpEventType.Response) {
          this.cacheService.addToCache(req, event);
          // delete pending request
          this.cacheService.deleteFromQueue(req);
        }
      }),
      shareReplay()
    );

    // add pending request to queue for cache parallel request
    this.cacheService.addToQueue(req, shared);

    return shared;
  }

  /**
   * Send http request (next handler)
   */
  sendRequest(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // trim custom headers before send request
    let headers: HttpHeaders = req.headers;
    let needClone = false;
    for (const header of NgHttpCachingHeadersList) {
      if (headers.has(header)) {
        needClone = true;
        headers = headers.delete(header);
      }
    }
    if (needClone) {
      req = req.clone({ headers });
    }
    return next.handle(req);
  }
}
