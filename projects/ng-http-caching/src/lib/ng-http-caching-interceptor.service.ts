import {
  HttpEvent,
  HttpEventType,
  HttpHandler,
  HttpHandlerFn,
  HttpHeaders,
  HttpInterceptor,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { asyncScheduler, Observable, of, scheduled, throwError } from 'rxjs';
import { tap, shareReplay, finalize, catchError } from 'rxjs/operators';
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

  // Checked if there is cached response for this request.
  // The cache is read before the queue: while a stale entry is being refreshed in
  // background its key is into the queue, and joining that request would make the
  // caller wait for the network instead of serving it the response we already have.
  const hit = cacheService.getFromCacheWithState(req);
  if (hit) {
    if (hit.stale) {
      // stale-while-revalidate: the subscriber gets the cached response right away, and
      // the entry is refreshed in background for whoever asks next
      revalidate(req, next, cacheService);
    }
    return scheduled(of(hit.response.clone()), asyncScheduler);
  }

  // Checked if there is pending response for this request
  const cachedObservable: Observable<HttpEvent<any>> | undefined = cacheService.getFromQueue(req);
  if (cachedObservable) {
    return cachedObservable;
  }

  // If the request of going through for first time
  // then let the request proceed and cache the response

  const keep = cacheService.keepInFlight(req);

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

  if (keep) {
    // one more subscriber, so the request survives the caller going away. `refCount` is
    // left on, so that cancelling this subscription (the service being destroyed) still
    // cancels the request instead of leaving it running.
    cacheService.keepAlive(shared);
  }

  return shared;
};

/**
 * Refresh a stale entry in background. Nothing is emitted to the caller: the response
 * only lands into the cache, for the next request.
 */
const revalidate = (
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  cacheService: NgHttpCachingService,
): void => {
  // a refresh is already running for this key, or a first request is still in flight
  if (cacheService.getFromQueue(req)) {
    return;
  }
  // the same request, plus `If-None-Match`/`If-Modified-Since` when the cached response
  // carries a validator: the backend can then answer `304 Not Modified` with no body
  const shared = sendRequest(cacheService.getConditionalRequest(req), next).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) {
        cacheService.addToCache(req, event);
      }
    }),
    catchError((error) => {
      // Angular reports a 304 as an error, because it isn't a 2xx. It is the good case:
      // what we hold is still current.
      if (error?.status === 304) {
        const confirmed = cacheService.confirmFromCache(req);
        if (confirmed) {
          return of(confirmed);
        }
      }
      return throwError(() => error);
    }),
    finalize(() => {
      cacheService.deleteFromQueue(req);
    }),
    // no `refCount`: the refresh must survive our own unsubscribe, and any parallel
    // request finding it into the queue gets the very same response
    shareReplay({ bufferSize: 1, refCount: false }),
  );
  cacheService.addToQueue(req, shared);
  // a failed revalidation keeps the stale entry and must not reach the global error
  // handler: the caller has already been served
  shared.subscribe({ error: () => undefined });
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
