import {
  HttpEvent,
  HttpEventType,
  HttpHandler,
  HttpHandlerFn,
  HttpHeaders,
  HttpInterceptor,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { asyncScheduler, Observable, of, scheduled } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { NgHttpCachingService, NgHttpCachingHeadersList } from './ng-http-caching.service';

/**
 * Send the request to the next handler, trimming the custom headers before it goes out.
 */
const sendRequest = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
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
  return next(req);
};

/**
 * The caching behaviour, shared by the functional interceptor and the class one.
 */
const handle = (
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  cacheService: NgHttpCachingService,
): Observable<HttpEvent<any>> => {
  // run garbage collector
  cacheService.runGc();

  // Don't cache if it's not cacheable
  if (!cacheService.isCacheable(req)) {
    return sendRequest(req, next).pipe(
      tap((event) => {
        if (event.type === HttpEventType.Response && event.ok) {
          cacheService.clearCacheByMutation(req);
        }
      }),
    );
  }

  // Checked if there is pending response for this request
  const cachedObservable: Observable<HttpEvent<any>> | undefined = cacheService.getFromQueue(req);
  if (cachedObservable) {
    return cachedObservable;
  }

  // Checked if there is cached response for this request
  const cachedResponse: HttpResponse<any> | undefined = cacheService.getFromCache(req);
  if (cachedResponse) {
    return scheduled(of(cachedResponse.clone()), asyncScheduler);
  }

  // If the request of going through for first time
  // then let the request proceed and cache the response

  const shared = sendRequest(req, next).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) {
        if (event.ok) {
          // a mutation can be cacheable too (eg. `allowedMethod: ['ALL']`):
          // invalidate before caching, so the response of this very request survives
          cacheService.clearCacheByMutation(req);
        }
        cacheService.addToCache(req, event);
      }
    }),
    finalize(() => {
      // delete pending request
      cacheService.deleteFromQueue(req);
    }),
    shareReplay({
      bufferSize: 1,
      refCount: true,
    }),
  );

  // add pending request to queue for cache parallel request
  cacheService.addToQueue(req, shared);

  return shared;
};

/**
 * Functional interceptor, for `provideHttpClient(withInterceptors([...]))`, eg.:
 *
 * ```ts
 * provideNgHttpCaching(),
 * provideHttpClient(withInterceptors([ngHttpCachingInterceptor])),
 * ```
 *
 * Use this one or `withInterceptorsFromDi()`, not both: registered twice, the caching
 * would run twice on every request.
 */
export const ngHttpCachingInterceptor: HttpInterceptorFn = (req, next) =>
  handle(req, next, inject(NgHttpCachingService));

@Injectable()
export class NgHttpCachingInterceptorService implements HttpInterceptor {
  private readonly cacheService: NgHttpCachingService = inject(NgHttpCachingService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return handle(req, (request) => next.handle(request), this.cacheService);
  }

  /**
   * Send http request (next handler)
   */
  sendRequest(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return sendRequest(req, (request) => next.handle(request));
  }
}
