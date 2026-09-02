import { TestBed } from '@angular/core/testing';
import {
  HttpRequest,
  HttpHandler,
  HttpResponse,
  HttpEvent,
  HttpHeaders,
  HttpContext,
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, Observable, throwError, firstValueFrom } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingMutationStrategy,
  NgHttpCachingInvalidation,
  NgHttpCachingStrategy,
  NgHttpCachingConfig,
  withNgHttpCachingContext,
} from './ng-http-caching.service';
import {
  NgHttpCachingInterceptorService,
  ngHttpCachingInterceptor,
} from './ng-http-caching-interceptor.service';
import { provideNgHttpCaching } from './ng-http-caching-provider';
import { withNgHttpCachingLocalStorage } from './storage/ng-http-caching-local-storage';

const DELAY = 50;

class BaseHandler extends HttpHandler {
  constructor(
    private response: HttpResponse<any>,
    private delay?: number,
  ) {
    super();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(_req: HttpRequest<any>): Observable<HttpEvent<any>> {
    if (typeof this.delay === 'number' && this.delay > 0) {
      return of(this.response).pipe(delay(this.delay));
    }
    return of(this.response);
  }
}

class MockHandler extends BaseHandler {
  constructor() {
    super(new HttpResponse({ status: 200, body: { date: new Date().toJSON() } }), DELAY);
  }
}

class EchoMockHandler extends HttpHandler {
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    return of(new HttpResponse({ status: 200, body: req })).pipe(delay(DELAY));
  }
}

class ErrorMockHandler extends HttpHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    return throwError(() => 'This is an error!').pipe(delay(DELAY));
  }
}

function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

describe('NgHttpCachingInterceptorService', () => {
  let service: NgHttpCachingInterceptorService;
  let httpCacheService: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNgHttpCaching(),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NgHttpCachingInterceptorService);
    httpCacheService = TestBed.inject(NgHttpCachingService);
  });

  afterEach(() => {
    const store = httpCacheService.getStore();
    store.clear();
    expect(store.size).toBe(0);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should cached', async () => {
    const url = 'https://angular.io/docs?foo=bar';
    const response1 = await firstValueFrom(
      service.intercept(new HttpRequest('GET', url), new MockHandler()),
    );
    expect(response1).toBeTruthy();

    const cached1 = httpCacheService.getStore().get('GET@' + url);
    expect(cached1).toBeTruthy();

    await sleep(DELAY / 3);

    const response2 = await firstValueFrom(
      service.intercept(new HttpRequest('GET', url), new MockHandler()),
    );
    expect(response2).toBeTruthy();
    const cached2 = httpCacheService.getStore().get('GET@' + url);
    expect(cached2).toBeTruthy();
    expect(cached2).toEqual(cached1);
  }, 1000);

  it('not should cached', async () => {
    const url = 'https://angular.io/docs?foo=bar';
    const response = await firstValueFrom(
      service.intercept(new HttpRequest('DELETE', url), new MockHandler()),
    );
    expect(response).toBeTruthy();
    expect(httpCacheService.getStore().get(url)).toBeUndefined();
  }, 1000);

  it('sendRequest trim headers', async () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
      headers: new HttpHeaders({
        CHECK: '1',
        [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
        [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
        [NgHttpCachingHeaders.LIFETIME]: '1',
      }),
    });

    expect(req.headers.has(NgHttpCachingHeaders.ALLOW_CACHE)).toBe(true);
    expect(req.headers.has(NgHttpCachingHeaders.DISALLOW_CACHE)).toBe(true);
    expect(req.headers.has(NgHttpCachingHeaders.LIFETIME)).toBe(true);
    expect(req.headers.has('CHECK')).toBe(true);

    const response = await firstValueFrom(service.sendRequest(req, new EchoMockHandler()));
    expect(response).toBeTruthy();

    const body: HttpResponse<any> = (response as any).body;

    expect(body).toBeTruthy();

    const headers: HttpHeaders = body.headers;

    expect(headers).toBeTruthy();

    expect(headers.has(NgHttpCachingHeaders.ALLOW_CACHE)).toBe(false);
    expect(headers.has(NgHttpCachingHeaders.DISALLOW_CACHE)).toBe(false);
    expect(headers.has(NgHttpCachingHeaders.LIFETIME)).toBe(false);
    expect(headers.has('CHECK')).toBe(true);
  }, 1000);

  it('parallel requests', async () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=parallel');

    const responses: HttpEvent<any>[] = [];

    expect(httpCacheService.getFromQueue(req)).toBeUndefined();

    service.intercept(req, new MockHandler()).subscribe((response) => {
      expect(response).toBeTruthy();
      responses.push(response);
    });

    await sleep(DELAY / 3);

    expect(httpCacheService.getFromQueue(req)).toBeTruthy();

    service.intercept(req, new MockHandler()).subscribe((response) => {
      expect(response).toBeTruthy();
      responses.push(response);
    });
    expect(httpCacheService.getFromQueue(req)).toBeTruthy();

    service.intercept(req, new MockHandler()).subscribe((response) => {
      expect(response).toBeTruthy();
      responses.push(response);
    });
    expect(httpCacheService.getFromQueue(req)).toBeTruthy();

    await sleep(500);

    expect(httpCacheService.getFromQueue(req)).toBeUndefined();

    expect(responses.length).toBe(3);
    expect(responses[0]).toEqual(responses[1]);
    expect(responses[0]).toEqual(responses[2]);
  }, 1000);

  it('nested requests', async () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=nested');

    expect(httpCacheService.getFromQueue(req)).toBeUndefined();

    const pending1 = firstValueFrom(service.intercept(req, new MockHandler()));
    expect(httpCacheService.getFromQueue(req)).toBeTruthy();

    const response1 = await pending1;
    expect(response1).toBeTruthy();

    await sleep(DELAY / 3);
    expect(httpCacheService.getFromQueue(req)).toBeUndefined();

    const response2 = await firstValueFrom(service.intercept(req, new MockHandler()));
    expect(response2).toBeTruthy();
    expect(response1).toEqual(response2);

    await sleep(DELAY / 3);
    expect(httpCacheService.getFromQueue(req)).toBeUndefined();

    const response3 = await firstValueFrom(service.intercept(req, new MockHandler()));
    expect(response3).toBeTruthy();
    expect(response1).toEqual(response3);

    await sleep(DELAY / 3);
    expect(httpCacheService.getFromQueue(req)).toBeUndefined();
  }, 1000);

  it('error requests', async () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=error');

    await expect(firstValueFrom(service.intercept(req, new ErrorMockHandler()))).rejects.toBe(
      'This is an error!',
    );

    expect(httpCacheService.getFromCache(req)).toBeUndefined();
  }, 1000);
});

describe('NgHttpCachingInterceptorService: cache headers', () => {
  let interceptor: NgHttpCachingInterceptorService;
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNgHttpCaching({ checkResponseHeaders: true }),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    interceptor = TestBed.inject(NgHttpCachingInterceptorService);
    service = TestBed.inject(NgHttpCachingService);
  });

  afterEach(() => {
    service.clearCache();
  });

  it('not should cached by header cache control no-cache', async () => {
    const request = new HttpRequest('GET', 'https://angular.io/docs?foo=bar-no-cache');
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({ 'cache-control': 'no-cache' }),
      body: { result: true },
    });
    const result = await firstValueFrom(interceptor.intercept(request, new BaseHandler(response)));
    expect(result).toBeTruthy();
    expect(service.getFromCache(request)).toBeUndefined();
  }, 1000);

  it('not should cached by header cache control no-store', async () => {
    const request = new HttpRequest('GET', 'https://angular.io/docs?foo=bar-no-cache');
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({ 'cache-control': 'no-store' }),
      body: { result: true },
    });
    const result = await firstValueFrom(interceptor.intercept(request, new BaseHandler(response)));
    expect(result).toBeTruthy();
    expect(service.getFromCache(request)).toBeUndefined();
  }, 1000);

  it('not should cached by header expire', async () => {
    const request = new HttpRequest('GET', 'https://angular.io/docs?foo=bar-no-cache');
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({ expires: new Date().toJSON() }),
      body: { result: true },
    });
    const result = await firstValueFrom(interceptor.intercept(request, new BaseHandler(response)));
    expect(result).toBeTruthy();
    expect(service.getFromCache(request)).toBeUndefined();
  }, 1000);
});

describe('NgHttpCachingInterceptorService: mutation on a cacheable method', () => {
  let interceptor: NgHttpCachingInterceptorService;
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNgHttpCaching({
          allowedMethod: ['ALL'],
          clearCacheOnMutation: NgHttpCachingMutationStrategy.ALL,
        }),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    interceptor = TestBed.inject(NgHttpCachingInterceptorService);
    service = TestBed.inject(NgHttpCachingService);
  });

  afterEach(() => {
    service.clearCache();
  });

  it('should invalidate the cache even when the mutation itself is cacheable', async () => {
    const get = new HttpRequest('GET', 'https://angular.io/items');
    await firstValueFrom(interceptor.intercept(get, new MockHandler()));
    expect(service.getFromCache(get)).toBeTruthy();

    const post = new HttpRequest('POST', 'https://angular.io/items', { foo: 'bar' });
    await firstValueFrom(interceptor.intercept(post, new MockHandler()));

    expect(service.getFromCache(get)).toBeUndefined();
    // the response of the mutation itself is still cached
    expect(service.getFromCache(post)).toBeTruthy();
  }, 1000);
});

/**
 * Counts how many times the backend was actually reached.
 */
class CountingHandler extends HttpHandler {
  public calls = 0;
  constructor(private readonly delayMs = 0) {
    super();
  }
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    this.calls++;
    const res = new HttpResponse({
      status: 200,
      body: { call: this.calls, url: req.urlWithParams },
    });
    return this.delayMs > 0 ? of(res).pipe(delay(this.delayMs)) : of(res);
  }
}

function setup(config?: NgHttpCachingConfig): {
  interceptor: NgHttpCachingInterceptorService;
  service: NgHttpCachingService;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      config ? provideNgHttpCaching(config) : provideNgHttpCaching(),
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
    ],
  });
  return {
    interceptor: TestBed.inject(NgHttpCachingInterceptorService),
    service: TestBed.inject(NgHttpCachingService),
  };
}

const GET = (url: string, options?: { headers?: HttpHeaders; context?: HttpContext }) =>
  new HttpRequest('GET', url, options);

describe('NgHttpCachingInterceptorService: behaviour through the interceptor', () => {
  it('a cache hit should not reach the backend', async () => {
    const { interceptor } = setup();
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?hit');

    const first = await firstValueFrom(interceptor.intercept(req, handler));
    const second = await firstValueFrom(interceptor.intercept(req, handler));

    expect(handler.calls).toBe(1);
    expect((first as HttpResponse<any>).body).toEqual((second as HttpResponse<any>).body);
  }, 1000);

  it('an expired entry should reach the backend again', async () => {
    const { interceptor } = setup({ lifetime: 20 });
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?expire');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(40);
    await firstValueFrom(interceptor.intercept(req, handler));

    expect(handler.calls).toBe(2);
  }, 1000);

  it('the X-NG-HTTP-CACHING-LIFETIME header should drive the expiration', async () => {
    const { interceptor } = setup();
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?header-lifetime', {
      headers: new HttpHeaders({ [NgHttpCachingHeaders.LIFETIME]: '20' }),
    });

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(40);
    await firstValueFrom(interceptor.intercept(req, handler));

    expect(handler.calls).toBe(2);
  }, 1000);

  it('the queue should be empty once the request completed', async () => {
    const { interceptor, service } = setup();
    await firstValueFrom(
      interceptor.intercept(GET('https://angular.io/docs?q'), new CountingHandler()),
    );
    expect(service.getQueue().size).toBe(0);
  }, 1000);

  it('an error should empty the queue and cache nothing', async () => {
    const { interceptor, service } = setup();
    await expect(
      firstValueFrom(
        interceptor.intercept(GET('https://angular.io/docs?err'), new ErrorMockHandler()),
      ),
    ).rejects.toBe('This is an error!');
    expect(service.getQueue().size).toBe(0);
    expect(service.getStore().size).toBe(0);
  }, 1000);

  it('DISALLOW_ALL should cache only the requests carrying the allow header', async () => {
    const { interceptor, service } = setup({
      cacheStrategy: NgHttpCachingStrategy.DISALLOW_ALL,
    });
    const handler = new CountingHandler();

    await firstValueFrom(interceptor.intercept(GET('https://angular.io/docs?plain'), handler));
    expect(service.getStore().size).toBe(0);

    await firstValueFrom(
      interceptor.intercept(
        GET('https://angular.io/docs?allowed', {
          headers: new HttpHeaders({ [NgHttpCachingHeaders.ALLOW_CACHE]: '1' }),
        }),
        handler,
      ),
    );
    expect(service.getStore().size).toBe(1);
  }, 1000);

  it('a context override should win over the config', async () => {
    const { interceptor, service } = setup();
    const context = withNgHttpCachingContext({ isCacheable: () => false });

    await firstValueFrom(
      interceptor.intercept(GET('https://angular.io/docs?ctx', { context }), new CountingHandler()),
    );

    expect(service.getStore().size).toBe(0);
  }, 1000);

  it('IDENTICAL should invalidate only the mutated url', async () => {
    const { interceptor, service } = setup({
      clearCacheOnMutation: NgHttpCachingMutationStrategy.IDENTICAL,
    });
    const handler = new CountingHandler();

    await firstValueFrom(interceptor.intercept(GET('https://angular.io/api/users'), handler));
    await firstValueFrom(interceptor.intercept(GET('https://angular.io/api/posts'), handler));
    expect(service.getStore().size).toBe(2);

    await firstValueFrom(
      interceptor.intercept(new HttpRequest('POST', 'https://angular.io/api/users', {}), handler),
    );

    expect(service.getStore().has('GET@https://angular.io/api/users')).toBe(false);
    expect(service.getStore().has('GET@https://angular.io/api/posts')).toBe(true);
  }, 1000);

  it('COLLECTION should invalidate also the parent collection', async () => {
    const { interceptor, service } = setup({
      clearCacheOnMutation: NgHttpCachingMutationStrategy.COLLECTION,
    });
    const handler = new CountingHandler();

    await firstValueFrom(interceptor.intercept(GET('https://angular.io/api/users'), handler));
    await firstValueFrom(interceptor.intercept(GET('https://angular.io/api/users/24'), handler));
    await firstValueFrom(interceptor.intercept(GET('https://angular.io/api/other'), handler));
    expect(service.getStore().size).toBe(3);

    await firstValueFrom(
      interceptor.intercept(new HttpRequest('DELETE', 'https://angular.io/api/users/24'), handler),
    );

    expect(service.getStore().size).toBe(1);
    expect(service.getStore().has('GET@https://angular.io/api/other')).toBe(true);
  }, 1000);

  it('a context override should be honoured with a persistent store too', async () => {
    // an HttpContext holds live functions and can't be serialized with the entry: the
    // override has to be read from the request being served, and not from the one the
    // store gave back
    localStorage.clear();
    const { interceptor } = setup({ store: withNgHttpCachingLocalStorage() });
    const handler = new CountingHandler();
    const context = withNgHttpCachingContext({ isExpired: () => true });
    const req = GET('https://angular.io/docs?ctx-persistent', { context });

    await firstValueFrom(interceptor.intercept(req, handler));
    await firstValueFrom(interceptor.intercept(req, handler));

    // the entry is always expired, so the backend is reached again
    expect(handler.calls).toBe(2);
  }, 1000);

  it('a response in flight when a mutation succeeds should not be cached', async () => {
    const { interceptor, service } = setup({
      clearCacheOnMutation: NgHttpCachingMutationStrategy.ALL,
    });
    const backend = new CountingHandler(60);
    const get = GET('https://angular.io/api/items');

    // the GET starts and is still travelling
    const pendingGet = firstValueFrom(interceptor.intercept(get, backend));
    await sleep(10);

    // meanwhile a mutation on the same collection succeeds and clears the cache
    await firstValueFrom(
      interceptor.intercept(
        new HttpRequest('POST', 'https://angular.io/api/items', {}),
        new CountingHandler(),
      ),
    );

    // the GET resolves with data that predates the mutation
    await pendingGet;

    // keeping it would make the invalidation pointless for a whole lifetime
    expect(service.getFromCache(get)).toBeUndefined();

    const after = (await firstValueFrom(
      interceptor.intercept(GET('https://angular.io/api/items'), backend),
    )) as HttpResponse<any>;
    expect(backend.calls).toBe(2);
    expect(after.body.call).toBe(2);
  }, 2000);

  it('the first consumer should not be able to poison the cached body', async () => {
    const { interceptor } = setup();
    const handler = new CountingHandler();
    const req = GET('https://angular.io/api/poisoned');

    const first = (await firstValueFrom(interceptor.intercept(req, handler))) as HttpResponse<any>;
    // the immutability guarantee applies from the very first delivery, and not only to the
    // responses read back from the cache
    expect(Object.isFrozen(first.body)).toBe(true);

    const second = (await firstValueFrom(interceptor.intercept(req, handler))) as HttpResponse<any>;
    expect(handler.calls).toBe(1);
    expect(second.body.call).toBe(1);
  }, 1000);

  it('the response of the request that fills the cache should stay adaptable', async () => {
    const { interceptor } = setup();
    const req = GET('https://angular.io/api/adapt');

    const first = (await firstValueFrom(
      interceptor.intercept(req, new CountingHandler()),
    )) as HttpResponse<any>;

    // only the body is made immutable: the response itself is rebuilt by whoever adapts it
    // downstream, and freezing it makes `status`, `ok`, `url`, ... read only
    expect(Object.isFrozen(first)).toBe(false);
    expect(() => first.clone({ status: 204 })).not.toThrow();
  }, 1000);

  it('responseSerializer should hand a mutable copy of the body to every cache hit', async () => {
    const { interceptor, service } = setup({
      responseSerializer: (body) => structuredClone(body),
    });
    const handler = new CountingHandler();
    const req = GET('https://angular.io/api/serialized');

    const first = (await firstValueFrom(interceptor.intercept(req, handler))) as HttpResponse<any>;
    const second = (await firstValueFrom(interceptor.intercept(req, handler))) as HttpResponse<any>;

    expect(handler.calls).toBe(1);
    // the request that fills the cache gets a mutable body too
    expect(Object.isFrozen(first.body)).toBe(false);
    expect(Object.isFrozen(second.body)).toBe(false);
    second.body.call = 99;

    // the copy handed to the consumer is its own: the store is untouched
    const third = (await firstValueFrom(interceptor.intercept(req, handler))) as HttpResponse<any>;
    expect(third.body.call).toBe(1);
    expect(
      service.getStore().get<unknown, any>('GET@https://angular.io/api/serialized')?.response.body
        .call,
    ).toBe(1);
  }, 1000);

  it('maxSize should evict the least recently used entry', async () => {
    const { interceptor, service } = setup({ maxSize: 2 });
    const handler = new CountingHandler();

    await firstValueFrom(interceptor.intercept(GET('https://angular.io/a'), handler));
    await sleep(5);
    await firstValueFrom(interceptor.intercept(GET('https://angular.io/b'), handler));
    await sleep(5);
    // touch "a": it becomes the most recently used
    await firstValueFrom(interceptor.intercept(GET('https://angular.io/a'), handler));
    await sleep(5);
    await firstValueFrom(interceptor.intercept(GET('https://angular.io/c'), handler));

    expect(service.getStore().size).toBe(2);
    expect(service.getStore().has('GET@https://angular.io/a')).toBe(true);
    expect(service.getStore().has('GET@https://angular.io/c')).toBe(true);
    expect(service.getStore().has('GET@https://angular.io/b')).toBe(false);
  }, 1000);
});

describe('ngHttpCachingInterceptor: functional interceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideNgHttpCaching(),
        provideHttpClient(withInterceptors([ngHttpCachingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('should cache without withInterceptorsFromDi()', async () => {
    const url = 'https://angular.io/docs?functional';

    const first = firstValueFrom(http.get(url));
    ctrl.expectOne(url).flush({ ok: 1 });
    expect(await first).toEqual({ ok: 1 });

    // served from the cache: the backend isn't reached a second time
    expect(await firstValueFrom(http.get(url))).toEqual({ ok: 1 });
    ctrl.expectNone(url);
  }, 1000);

  it('should trim the custom headers before the request goes out', async () => {
    const url = 'https://angular.io/docs?functional-headers';

    const done = firstValueFrom(http.get(url, { headers: { [NgHttpCachingHeaders.TAG]: 'foo' } }));
    const req = ctrl.expectOne(url);
    expect(req.request.headers.has(NgHttpCachingHeaders.TAG)).toBe(false);
    req.flush({ ok: 1 });
    await done;
  }, 1000);
});

describe('NgHttpCachingInterceptorService: staleTime and stale-while-revalidate', () => {
  const bodyOf = (event: HttpEvent<any>) => (event as HttpResponse<any>).body;

  it('should serve the stale response and refresh it in background', async () => {
    const { interceptor } = setup({ staleTime: 100 });
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?swr');

    expect(bodyOf(await firstValueFrom(interceptor.intercept(req, handler)))).toEqual({
      call: 1,
      url: req.urlWithParams,
    });
    await sleep(150);

    // the entry is stale: the old body is served right away...
    expect(bodyOf(await firstValueFrom(interceptor.intercept(req, handler)))).toEqual({
      call: 1,
      url: req.urlWithParams,
    });
    // ...and the backend has been asked for a fresh one
    expect(handler.calls).toBe(2);

    await sleep(10);
    // the refresh has landed into the cache, without any new request
    expect(bodyOf(await firstValueFrom(interceptor.intercept(req, handler)))).toEqual({
      call: 2,
      url: req.urlWithParams,
    });
    expect(handler.calls).toBe(2);
  }, 1000);

  it('should not revalidate anything without staleTime', async () => {
    const { interceptor } = setup();
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?no-swr');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(40);
    await firstValueFrom(interceptor.intercept(req, handler));

    expect(handler.calls).toBe(1);
  }, 1000);

  it('should refetch, not revalidate, an entry past its lifetime', async () => {
    const { interceptor } = setup({ staleTime: 10, lifetime: 30 });
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?swr-expired');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(50);

    // expired, so the caller waits for the fresh response instead of getting the old one
    expect(bodyOf(await firstValueFrom(interceptor.intercept(req, handler)))).toEqual({
      call: 2,
      url: req.urlWithParams,
    });
    expect(handler.calls).toBe(2);
  }, 1000);

  it('should refresh only once for parallel stale hits', async () => {
    const { interceptor } = setup({ staleTime: 20 });
    const handler = new CountingHandler(30);
    const req = GET('https://angular.io/docs?swr-parallel');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(40);

    const bodies = await Promise.all([
      firstValueFrom(interceptor.intercept(req, handler)),
      firstValueFrom(interceptor.intercept(req, handler)),
      firstValueFrom(interceptor.intercept(req, handler)),
    ]);

    // all of them got the cached body, and a single refresh was sent
    for (const body of bodies) {
      expect(bodyOf(body)).toEqual({ call: 1, url: req.urlWithParams });
    }
    expect(handler.calls).toBe(2);
  }, 1000);

  it('should keep the stale entry when the refresh fails', async () => {
    const { interceptor, service } = setup({ staleTime: 20 });
    const req = GET('https://angular.io/docs?swr-error');

    await firstValueFrom(interceptor.intercept(req, new CountingHandler()));
    await sleep(40);

    await firstValueFrom(interceptor.intercept(req, new ErrorMockHandler()));
    await sleep(DELAY * 2);

    // the failed refresh left the cache as it was, and emptied the queue
    expect(service.getStore().size).toBe(1);
    expect(service.getQueue().size).toBe(0);
    expect(bodyOf(await firstValueFrom(interceptor.intercept(req, new CountingHandler())))).toEqual(
      { call: 1, url: req.urlWithParams },
    );
  }, 1000);

  it('should let the isStale hook decide', async () => {
    const { interceptor } = setup({
      staleTime: 60_000,
      isStale: (entry) => entry.request.urlWithParams.includes('always-stale'),
    });
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?always-stale');

    await firstValueFrom(interceptor.intercept(req, handler));
    await firstValueFrom(interceptor.intercept(req, handler));

    expect(handler.calls).toBe(2);
  }, 1000);
});

describe('NgHttpCachingInterceptorService: keepInFlight', () => {
  it('should not cache a request abandoned before the response, by default', async () => {
    const { interceptor, service } = setup();
    const handler = new CountingHandler(DELAY);
    const req = GET('https://angular.io/docs?abandoned');

    // subscribe and leave right away, like a destroyed component does
    interceptor.intercept(req, handler).subscribe().unsubscribe();
    await sleep(DELAY * 2);

    expect(service.getStore().size).toBe(0);
    expect(service.getQueue().size).toBe(0);
  }, 1000);

  it('should cache a request abandoned before the response, with keepInFlight', async () => {
    const { interceptor, service } = setup({ keepInFlight: true });
    const handler = new CountingHandler(DELAY);
    const req = GET('https://angular.io/docs?kept');

    interceptor.intercept(req, handler).subscribe().unsubscribe();
    await sleep(DELAY * 2);

    expect(service.getStore().size).toBe(1);
    expect(service.getQueue().size).toBe(0);

    // the next request is served by the cache the abandoned one filled
    await firstValueFrom(interceptor.intercept(req, handler));
    expect(handler.calls).toBe(1);
  }, 1000);

  it('should keep deduplicating the parallel requests', async () => {
    const { interceptor } = setup({ keepInFlight: true });
    const handler = new CountingHandler(DELAY);
    const req = GET('https://angular.io/docs?kept-parallel');

    const [first, second] = await Promise.all([
      firstValueFrom(interceptor.intercept(req, handler)),
      firstValueFrom(interceptor.intercept(req, handler)),
    ]);

    expect(handler.calls).toBe(1);
    expect((first as HttpResponse<any>).body).toEqual((second as HttpResponse<any>).body);
  }, 1000);

  it('should take the decision per request', async () => {
    const { interceptor, service } = setup({
      keepInFlight: (req) => req.urlWithParams.includes('keep-me'),
    });
    const handler = new CountingHandler(DELAY);

    interceptor.intercept(GET('https://angular.io/keep-me'), handler).subscribe().unsubscribe();
    interceptor.intercept(GET('https://angular.io/drop-me'), handler).subscribe().unsubscribe();
    await sleep(DELAY * 2);

    expect(service.getStore().has('GET@https://angular.io/keep-me')).toBe(true);
    expect(service.getStore().has('GET@https://angular.io/drop-me')).toBe(false);
  }, 1000);

  it('should swallow the error of an abandoned request', async () => {
    const { interceptor, service } = setup({ keepInFlight: true });
    const req = GET('https://angular.io/docs?kept-error');

    interceptor.intercept(req, new ErrorMockHandler()).subscribe({ error: () => undefined });
    await sleep(DELAY * 2);

    expect(service.getStore().size).toBe(0);
    expect(service.getQueue().size).toBe(0);
  }, 1000);

  it('should cancel the kept requests when the service is destroyed', async () => {
    const { interceptor, service } = setup({ keepInFlight: true });
    const handler = new CountingHandler(DELAY);
    const req = GET('https://angular.io/docs?kept-destroy');

    interceptor.intercept(req, handler).subscribe().unsubscribe();
    service.ngOnDestroy();
    await sleep(DELAY * 2);

    expect(service.getStore().size).toBe(0);
  }, 1000);
});

describe('NgHttpCachingInterceptorService: mutationInvalidation STALE', () => {
  it('should serve the invalidated entry and refresh it in background', async () => {
    const { interceptor } = setup({
      clearCacheOnMutation: NgHttpCachingMutationStrategy.IDENTICAL,
      mutationInvalidation: NgHttpCachingInvalidation.STALE,
    });
    const handler = new CountingHandler();
    const url = 'https://angular.io/api/users';
    const req = GET(url);

    await firstValueFrom(interceptor.intercept(req, handler));
    await firstValueFrom(interceptor.intercept(new HttpRequest('POST', url, {}), handler));
    expect(handler.calls).toBe(2);

    // the mutation invalidated the entry, but it is still served right away...
    const served = await firstValueFrom(interceptor.intercept(req, handler));
    expect((served as HttpResponse<any>).body).toEqual({ call: 1, url });
    // ...and refreshed in background
    expect(handler.calls).toBe(3);

    await sleep(10);
    const refreshed = await firstValueFrom(interceptor.intercept(req, handler));
    expect((refreshed as HttpResponse<any>).body).toEqual({ call: 3, url });
    expect(handler.calls).toBe(3);
  }, 1000);

  it('should still remove the entries by default', async () => {
    const { interceptor, service } = setup({
      clearCacheOnMutation: NgHttpCachingMutationStrategy.IDENTICAL,
    });
    const handler = new CountingHandler();
    const url = 'https://angular.io/api/users';

    await firstValueFrom(interceptor.intercept(GET(url), handler));
    await firstValueFrom(interceptor.intercept(new HttpRequest('POST', url, {}), handler));

    expect(service.getStore().size).toBe(0);
  }, 1000);
});

/** answers 304 to a conditional request, 200 otherwise */
class NotModifiedHandler extends HttpHandler {
  public calls = 0;
  public lastRequest: HttpRequest<any> | undefined;
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    this.calls++;
    this.lastRequest = req;
    if (req.headers.has('If-None-Match') || req.headers.has('If-Modified-Since')) {
      return throwError(() => new HttpErrorResponse({ status: 304, url: req.url })).pipe(delay(1));
    }
    return of(
      new HttpResponse({
        status: 200,
        body: { call: this.calls },
        headers: new HttpHeaders({
          etag: 'W/"v1"',
          'last-modified': 'Wed, 02 Sep 2026 00:00:00 GMT',
        }),
      }),
    ).pipe(delay(1));
  }
}

describe('NgHttpCachingInterceptorService: conditional revalidation', () => {
  const bodyOf = (event: HttpEvent<any>) => (event as HttpResponse<any>).body;

  it('should revalidate with If-None-Match and keep the cached body on 304', async () => {
    // a wide staleTime: the assertion below is that the entry is fresh again after the
    // 304, and a tight window would race with the test clock
    const { interceptor, service } = setup({ staleTime: 200 });
    const handler = new NotModifiedHandler();
    const req = GET('https://angular.io/docs?etag');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(250);

    // stale: served from the cache, and refreshed with a conditional request
    expect(bodyOf(await firstValueFrom(interceptor.intercept(req, handler)))).toEqual({ call: 1 });
    await sleep(20);

    expect(handler.calls).toBe(2);
    expect(handler.lastRequest?.headers.get('If-None-Match')).toBe('W/"v1"');
    expect(handler.lastRequest?.headers.get('If-Modified-Since')).toBe(
      'Wed, 02 Sep 2026 00:00:00 GMT',
    );

    // the 304 confirmed the entry: it is fresh again, and the body is the one we had
    const entry = service.getStore().get(service.getKey(req));
    expect(entry?.response.body).toEqual({ call: 1 });
    expect(service.getFromCacheWithState(req)?.stale).toBe(false);

    // and no request is sent anymore
    expect(bodyOf(await firstValueFrom(interceptor.intercept(req, handler)))).toEqual({ call: 1 });
    expect(handler.calls).toBe(2);
  }, 2000);

  it('should not send the conditional headers with conditionalRevalidation off', async () => {
    const { interceptor } = setup({ staleTime: 30, conditionalRevalidation: false });
    const handler = new NotModifiedHandler();
    const req = GET('https://angular.io/docs?no-etag');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(60);
    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(20);

    expect(handler.calls).toBe(2);
    expect(handler.lastRequest?.headers.has('If-None-Match')).toBe(false);
  }, 2000);

  it('should not store the conditional headers into the cached request', async () => {
    const { interceptor, service } = setup({ staleTime: 30 });
    const handler = new NotModifiedHandler();
    const req = GET('https://angular.io/docs?etag-clean');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(60);
    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(20);

    const entry = service.getStore().get(service.getKey(req));
    expect(entry?.request.headers.has('If-None-Match')).toBe(false);
  }, 2000);

  it('should clear the invalidated flag when the backend confirms the entry', async () => {
    const { interceptor, service } = setup();
    const handler = new NotModifiedHandler();
    const req = GET('https://angular.io/docs?etag-invalidated');

    await firstValueFrom(interceptor.intercept(req, handler));
    service.invalidateCache();
    expect(service.getFromCacheWithState(req)?.stale).toBe(true);

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(20);

    expect(service.getFromCacheWithState(req)?.stale).toBe(false);
    expect(handler.calls).toBe(2);
  }, 2000);

  it('should leave the entry alone when there is no validator', async () => {
    const { interceptor } = setup({ staleTime: 30 });
    const handler = new CountingHandler();
    const req = GET('https://angular.io/docs?no-validator');

    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(60);
    await firstValueFrom(interceptor.intercept(req, handler));
    await sleep(20);

    expect(handler.calls).toBe(2);
  }, 2000);
});
