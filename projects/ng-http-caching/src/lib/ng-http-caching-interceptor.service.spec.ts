import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpRequest, HttpHandler, HttpResponse, HttpEvent, HttpHeaders, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Observable, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { NgHttpCachingService, NG_HTTP_CACHING_CONFIG, NgHttpCachingHeaders } from './ng-http-caching.service';
import { NgHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';
import { NgHttpCachingModule } from './ng-http-caching.module';

const DELAY = 50;

class MockHandler extends HttpHandler {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    return of(new HttpResponse({ status: 200, body: { date: new Date().toJSON() } })).pipe(delay(DELAY));
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

class NullMockHandler extends HttpHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    return of(null as any);
  }
}


function sleep(time: number): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

describe('NgHttpCachingInterceptorService', () => {
  let service: NgHttpCachingInterceptorService;
  let httpCacheService: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [NgHttpCachingModule],
    providers: [
        { provide: NG_HTTP_CACHING_CONFIG, useValue: {} },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NgHttpCachingInterceptorService,
            multi: true,
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
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

  it('should cached', (done) => {
    const url = 'https://angular.io/docs?foo=bar';
    service.intercept(new HttpRequest('GET', url), new MockHandler()).subscribe(async (response1) => {
      expect(response1).toBeTruthy();

      const cached1 = httpCacheService.getStore().get('GET@' + url);
      expect(cached1).toBeTruthy();

      await sleep(DELAY / 3);

      service.intercept(new HttpRequest('GET', url), new MockHandler()).subscribe(response2 => {
        expect(response2).toBeTruthy();
        const cached2 = httpCacheService.getStore().get('GET@' + url);
        expect(cached2).toBeTruthy();
        expect(cached2).toEqual(cached1);

        done();

      });
    });
  }, 1000);

  it('not should cached', (done) => {
    const url = 'https://angular.io/docs?foo=bar';
    service.intercept(new HttpRequest('DELETE', url), new MockHandler()).subscribe(response => {
      expect(response).toBeTruthy();
      expect(httpCacheService.getStore().get(url)).toBeUndefined();
      done();
    });
  }, 1000);

  it('sendRequest trim headers', (done) => {

    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
      headers: new HttpHeaders({
        CHECK: '1',
        [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
        [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
        [NgHttpCachingHeaders.LIFETIME]: '1',
      })
    });

    expect(req.headers.has(NgHttpCachingHeaders.ALLOW_CACHE)).toBeTrue();
    expect(req.headers.has(NgHttpCachingHeaders.DISALLOW_CACHE)).toBeTrue();
    expect(req.headers.has(NgHttpCachingHeaders.LIFETIME)).toBeTrue();
    expect(req.headers.has('CHECK')).toBeTrue();

    service.sendRequest(req, new EchoMockHandler()).subscribe(response => {
      expect(response).toBeTruthy();

      const body: HttpResponse<any> = (response as any).body;

      expect(body).toBeTruthy();

      const headers: HttpHeaders = body.headers;

      expect(headers).toBeTruthy();

      expect(body.headers.has(NgHttpCachingHeaders.ALLOW_CACHE)).toBeFalse();
      expect(body.headers.has(NgHttpCachingHeaders.DISALLOW_CACHE)).toBeFalse();
      expect(body.headers.has(NgHttpCachingHeaders.LIFETIME)).toBeFalse();
      expect(body.headers.has('CHECK')).toBeTrue();

      done();
    });
  }, 1000);

  it('parallel requests', (done) => {

    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=parallel');

    const responses: HttpEvent<any>[] = [];

    expect(httpCacheService.getFromQueue(req)).toBeUndefined();

    service.intercept(req, new MockHandler()).subscribe(response => {
      expect(response).toBeTruthy();
      responses.push(response);
    });

    sleep(DELAY / 3).then(() => {
      expect(httpCacheService.getFromQueue(req)).toBeTruthy();

      service.intercept(req, new MockHandler()).subscribe(response => {
        expect(response).toBeTruthy();
        responses.push(response);
      });
      expect(httpCacheService.getFromQueue(req)).toBeTruthy();

      service.intercept(req, new MockHandler()).subscribe(response => {
        expect(response).toBeTruthy();
        responses.push(response);
      });
      expect(httpCacheService.getFromQueue(req)).toBeTruthy();

      setTimeout(() => {
        expect(httpCacheService.getFromQueue(req)).toBeUndefined();

        expect(responses[0]).toEqual(responses[1]);
        expect(responses[0]).toEqual(responses[2]);

        done();
      }, 500);

    });
  }, 1000);

  it('nested requests', (done) => {

    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=nested');

    expect(httpCacheService.getFromQueue(req)).toBeUndefined();

    service.intercept(req, new MockHandler()).subscribe(async (response1) => {
      expect(response1).toBeTruthy();

      await sleep(DELAY / 3);
      expect(httpCacheService.getFromQueue(req)).toBeUndefined();

      service.intercept(req, new MockHandler()).subscribe(async (response2) => {
        expect(response2).toBeTruthy();
        expect(response1).toEqual(response2);

        await sleep(DELAY / 3);
        expect(httpCacheService.getFromQueue(req)).toBeUndefined();

        service.intercept(req, new MockHandler()).subscribe(async (response3) => {
          expect(response3).toBeTruthy();
          expect(response1).toEqual(response3);

          await sleep(DELAY / 3);
          expect(httpCacheService.getFromQueue(req)).toBeUndefined();

          done();
        });
      });
    });
    expect(httpCacheService.getFromQueue(req)).toBeTruthy();

  }, 1000);

  it('error requests', (done) => {

    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=error');

    service.intercept(req, new ErrorMockHandler()).subscribe(
      () => {
        expect(false).toBe(true);
        done();
      },
      error => {
        expect(error).toBe('This is an error!');
        expect(httpCacheService.getFromCache(req)).toBeUndefined();
        done();
      }
    );

  }, 1000);

  it('null requests', (done) => {

    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=null');

    service.intercept(req, new NullMockHandler()).subscribe(
      response => {
        expect(response).toBeNull();
        expect(httpCacheService.getFromCache(req)).toBeUndefined();
        done();
      }
    );

  }, 1000);
});
