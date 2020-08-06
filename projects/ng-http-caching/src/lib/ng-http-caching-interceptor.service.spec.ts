import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpRequest, HttpHandler, HttpResponse, HttpEvent } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Observable } from 'rxjs';
import { NgHttpCachingService, NG_HTTP_CACHING_CONFIG } from './ng-http-caching.service';
import { NgHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';

export class MockHandler extends HttpHandler {
  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    return of(new HttpResponse({status: 200, body: {date: new Date()}}));
  }
}

describe('NgHttpCachingInterceptorService', () => {
  let service: NgHttpCachingInterceptorService;
  let httpCacheService: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NgHttpCachingService,
        NgHttpCachingInterceptorService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: {} },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: NgHttpCachingInterceptorService,
          multi: true,
        },
      ],
    });
    service = TestBed.inject(NgHttpCachingInterceptorService);
    httpCacheService = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should cached', (done) => {
    const url = 'https://angular.io/docs?foo=bar';
    service.intercept(new HttpRequest('GET', url), new MockHandler()).subscribe(response1 => {
      expect(response1).toBeTruthy();

      const cached1 = httpCacheService.store.get(url);
      expect(cached1).toBeTruthy();

      service.intercept(new HttpRequest('GET', url), new MockHandler()).subscribe(response2 => {
        expect(response2).toBeTruthy();
        const cached2 = httpCacheService.store.get(url);
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
      expect(httpCacheService.store.get(url)).toBeUndefined();
      done();
    });
  }, 1000);
});
