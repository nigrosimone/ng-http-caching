import { TestBed } from '@angular/core/testing';
import {
  HttpRequest,
  HttpHandler,
  HttpResponse,
  HttpEvent,
  HttpHeaders,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Observable, throwError, firstValueFrom } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingMutationStrategy,
} from './ng-http-caching.service';
import { NgHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';
import { provideNgHttpCaching } from './ng-http-caching-provider';

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
