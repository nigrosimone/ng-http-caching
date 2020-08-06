import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NgxHttpCachingService } from './ng-http-caching.service';


@Injectable()
export class NgxHttpCachingInterceptorService implements HttpInterceptor {

  constructor(private readonly cacheService: NgxHttpCachingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Don't cache if it's not cacheable
    if ( !this.cacheService.isCacheable(req) ) {
      return next.handle(req);
    }

    // Checked if there is cached data for this URI
    const cachedResponse = this.cacheService.getFromCache(req);
    if (cachedResponse) {
      // In case of parallel requests to same URI,
      // return the request already in progress
      // otherwise return the last cached data
      return (cachedResponse instanceof Observable) ? cachedResponse : of(cachedResponse.clone());
    }

    // If the request of going through for first time
    // then let the request proceed and cache the response
    return next.handle(req)
        .pipe(tap(event => {
            if (event instanceof HttpResponse) {
                this.cacheService.addToCache(req, event.clone());
            }
        }));
  }
}
