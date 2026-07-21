import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse, HttpHeaders } from '@angular/common/http';
import {
  NgHttpCachingService,
  NG_HTTP_CACHING_CONFIG,
  NgHttpCachingConfigDefault,
  NgHttpCachingConfig,
  NgHttpCachingEntry,
  NgHttpCachingStrategy,
  NgHttpCachingHeaders,
  NG_HTTP_CACHING_SECOND_IN_MS,
  NG_HTTP_CACHING_MINUTE_IN_MS,
  NG_HTTP_CACHING_HOUR_IN_MS,
  NG_HTTP_CACHING_DAY_IN_MS,
  NG_HTTP_CACHING_WEEK_IN_MS,
  NG_HTTP_CACHING_MONTH_IN_MS,
  NG_HTTP_CACHING_YEAR_IN_MS,
  withNgHttpCachingContext,
  checkCacheHeaders,
  NG_HTTP_CACHING_CONTEXT,
  NgHttpCachingMutationStrategy,
} from './ng-http-caching.service';
import { VERSION } from '@angular/core';
import { provideNgHttpCaching } from './ng-http-caching-provider';
import { NgHttpCachingNgSimpleStateSentinel } from './storage/ng-http-caching-ng-simple-state-sentinel';
import { NgHttpCachingStorageInterface } from './storage/ng-http-caching-storage.interface';

function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

describe('NgHttpCachingService: no config', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have: default value', () => {
    expect(service.getConfig()).toEqual(NgHttpCachingConfigDefault);
  });

  it('should have: correct value', () => {
    expect(NG_HTTP_CACHING_SECOND_IN_MS).toBe(1000);
    expect(NG_HTTP_CACHING_MINUTE_IN_MS).toBe(NG_HTTP_CACHING_SECOND_IN_MS * 60);
    expect(NG_HTTP_CACHING_HOUR_IN_MS).toBe(NG_HTTP_CACHING_MINUTE_IN_MS * 60);
    expect(NG_HTTP_CACHING_DAY_IN_MS).toBe(NG_HTTP_CACHING_HOUR_IN_MS * 24);
    expect(NG_HTTP_CACHING_WEEK_IN_MS).toBe(NG_HTTP_CACHING_DAY_IN_MS * 7);
    expect(NG_HTTP_CACHING_MONTH_IN_MS).toBe(NG_HTTP_CACHING_DAY_IN_MS * 30);
    expect(NG_HTTP_CACHING_YEAR_IN_MS).toBe(NG_HTTP_CACHING_DAY_IN_MS * 365);
    expect(NgHttpCachingConfigDefault.lifetime).toBe(NG_HTTP_CACHING_HOUR_IN_MS);
    expect(NgHttpCachingConfigDefault.allowedMethod).toEqual(['GET', 'HEAD']);
    expect(NgHttpCachingConfigDefault.version).toBe(VERSION.major);
    expect(NgHttpCachingConfigDefault.cacheStrategy).toBe(NgHttpCachingStrategy.ALLOW_ALL);
  });
});

describe('NgHttpCachingService: empty config', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have: default value', () => {
    expect(service.getConfig()).toEqual(NgHttpCachingConfigDefault);
  });
});

describe('NgHttpCachingService: override config', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    lifetime: 10,
    allowedMethod: ['POST'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have: override value', () => {
    expect(service.getConfig().lifetime).not.toEqual(NgHttpCachingConfigDefault.lifetime);
    expect(service.getConfig().allowedMethod).not.toEqual(NgHttpCachingConfigDefault.allowedMethod);
    expect(service.getConfig().lifetime).toEqual(config.lifetime);
    expect(service.getConfig().allowedMethod).toEqual(config.allowedMethod);
  });
});

describe('NgHttpCachingService: getStore()', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return object', () => {
    expect(service.getStore()).toBeDefined();
  });

  it('has', () => {
    const keyUrl = 'https://angular.io/docs?foo=has';
    const store = service.getStore();
    const cacheEntry: NgHttpCachingEntry = {
      url: keyUrl,
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', keyUrl),
      version: VERSION.major,
    };
    store.set(keyUrl, cacheEntry);
    expect(store.has(keyUrl)).toBe(true);
    expect(store.delete(keyUrl)).toBe(true);
    expect(store.has(keyUrl)).toBe(false);
  });
});

describe('NgHttpCachingService: getQueue()', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return object', () => {
    expect(service.getQueue()).toBeDefined();
  });
});

describe('NgHttpCachingService: default getKey', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('default key is url with params', () => {
    const urlWithParams = 'https://angular.io/docs?foo=bar';
    const httpRequest = new HttpRequest('GET', urlWithParams);
    expect(service.getKey(httpRequest)).toEqual('GET@' + urlWithParams);
  });
});

describe('NgHttpCachingService: override getKey', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    getKey: (req: HttpRequest<any>): string => {
      return req.method + req.urlWithParams;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('override key is url with params and method', () => {
    const urlWithParams = 'https://angular.io/docs?foo=bar';
    const httpRequest = new HttpRequest('GET', urlWithParams);
    expect(service.getKey(httpRequest)).toEqual('GET' + urlWithParams);
  });
});

describe('NgHttpCachingService: override getKey return undefined', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getKey: (req: HttpRequest<any>): string => {
      return undefined as any;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService, { provide: NG_HTTP_CACHING_CONFIG, useValue: config }],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('override key is url with params', () => {
    const urlWithParams = 'https://angular.io/docs?foo=bar';
    const httpRequest = new HttpRequest('GET', urlWithParams);
    expect(service.getKey(httpRequest)).toEqual('GET@' + urlWithParams);
  });
});

describe('NgHttpCachingService: default isCacheable', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET is cacheable', () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });

  it("DELETE isn't cacheable", () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBe(false);
  });
});

describe('NgHttpCachingService: default isCacheable allow ALL', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    allowedMethod: ['ALL'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET is cacheable', () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });

  it('DELETE is cacheable', () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });
});

describe('NgHttpCachingService: default isCacheable allow two', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    allowedMethod: ['GET', 'DELETE'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET is cacheable', () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });

  it('DELETE is cacheable', () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });
});

describe('NgHttpCachingService: override isCacheable', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    isCacheable: (req: HttpRequest<any>): boolean => {
      // cacheable only if without query parameters
      return !req.urlWithParams.includes('?');
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it("GET with query parameters isn't cacheable", () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    expect(service.isCacheable(httpRequest)).toBe(false);
  });

  it('GET without query parameters is cacheable', () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });
});

describe('NgHttpCachingService: override isCacheable return undefined', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isCacheable: (req: HttpRequest<any>): boolean => {
      return undefined as any;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('cacheable', () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });

  it("don't cacheable", () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBe(false);
  });
});

describe('NgHttpCachingService: isCacheable strategy DISALLOW_ALL', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    cacheStrategy: NgHttpCachingStrategy.DISALLOW_ALL,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it("GET without allow header ins't cacheable", () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    expect(service.isCacheable(httpRequest)).toBe(false);
  });

  it('GET with allow header is cacheable', () => {
    const headers = new HttpHeaders({
      [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
    });
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
      headers,
    });
    expect(service.isCacheable(httpRequest)).toBe(true);
  });
});

describe('NgHttpCachingService: isCacheable strategy ALLOW_ALL', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    cacheStrategy: NgHttpCachingStrategy.ALLOW_ALL,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET without disallow header is cacheable', () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    expect(service.isCacheable(httpRequest)).toBe(true);
  });

  it("GET with disallow header isn't cacheable", () => {
    const headers = new HttpHeaders({
      [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
    });
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
      headers,
    });
    expect(service.isCacheable(httpRequest)).toBe(false);
  });
});

describe('NgHttpCachingService: default isExpired', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(false);
  });

  it('expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(true);
  });
});

describe('NgHttpCachingService: override isExpired', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isExpired: (entry: NgHttpCachingEntry): boolean => {
      return true;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired 1', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(true);
  });

  it('expired 2', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(true);
  });
});

describe('NgHttpCachingService: override isExpired return undefined', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isExpired: (entry: NgHttpCachingEntry): boolean => {
      return undefined as any;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(false);
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(true);
  });
});

describe('NgHttpCachingService: default isExpired with long lifetime', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    lifetime: NG_HTTP_CACHING_YEAR_IN_MS * 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired 1', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(false);
  });

  it('not expired 2', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(false);
  });
});

describe('NgHttpCachingService: default isExpired with infinite lifetime', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    lifetime: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(false);
  });
});

describe('NgHttpCachingService: default isExpired with request lifetime', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - NG_HTTP_CACHING_YEAR_IN_MS * 2,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgHttpCachingHeaders.LIFETIME]: NG_HTTP_CACHING_YEAR_IN_MS.toString(),
        }),
      }),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(true);
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgHttpCachingHeaders.LIFETIME]: NG_HTTP_CACHING_YEAR_IN_MS.toString(),
        }),
      }),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(false);
  });

  it('wrong negative expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgHttpCachingHeaders.LIFETIME]: '-1',
        }),
      }),
      version: VERSION.major,
    };
    expect(() => service.isExpired(cacheEntry)).toThrow(
      new Error('lifetime must be greater than or equal 0'),
    );
  });

  it('wrong NaN expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgHttpCachingHeaders.LIFETIME]: 'test',
        }),
      }),
      version: VERSION.major,
    };
    expect(() => service.isExpired(cacheEntry)).toThrow(
      new Error('lifetime must be greater than or equal 0'),
    );
  });
});

describe('NgHttpCachingService: change of version', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    version: VERSION.major,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isExpired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: (+VERSION.major + 1).toString(),
    };
    expect(service.isExpired(cacheEntry)).toBe(true);
  });

  it('isValid', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: (+VERSION.major + 1).toString(),
    };
    expect(service.isValid(cacheEntry)).toBe(false);
  });

  it('isValid not 200', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({ status: 500 }),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isValid(cacheEntry)).toBe(false);
  });
});

describe('NgHttpCachingService: ADD and GET and DELETE', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('ADD and GET expired', async () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.LIFETIME]: '10',
      }),
    });
    const res = new HttpResponse({ body: { foo: true } });
    expect(service.addToCache(req, res)).toBe(true);
    expect(service.getFromCache(req)).toEqual(res);

    await sleep(50);

    expect(service.getFromCache(req)).toBeUndefined();
  }, 1000);

  it('ADD and GET and DELETE', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    const res = new HttpResponse({ body: { foo: true } });
    expect(service.addToCache(req, res)).toBe(true);
    expect(service.getFromCache(req)).toEqual(res);
    expect(service.deleteFromCache(req)).toBe(true);
    expect(service.getFromCache(req)).toBeUndefined();
  });
});

describe('NgHttpCachingService: get default config', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('default', () => {
    expect(service.getConfig()).toEqual(NgHttpCachingConfigDefault);
  });
});

describe('NgHttpCachingService: get override config', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    lifetime: 0,
    allowedMethod: ['POST'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('override', () => {
    expect(service.getConfig().lifetime).toEqual(config.lifetime);
    expect(service.getConfig().allowedMethod).toEqual(config.allowedMethod);
  });
});

describe('NgHttpCachingService: clearCache', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('after clearCache no cached entry', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    const res = new HttpResponse({ body: { foo: true } });
    expect(service.addToCache(req, res)).toBe(true);
    expect(service.getFromCache(req)).toEqual(res);
    service.clearCache();
    expect(service.getFromCache(req)).toBeUndefined();
  });
});

describe('NgHttpCachingService: runGc', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('after runGc no cached entry', async () => {
    const reqExp = new HttpRequest('GET', 'https://angular.io/docs?foo=expired', {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.LIFETIME]: '1',
      }),
    });
    const reqFresh = new HttpRequest('GET', 'https://angular.io/docs?foo=fresh');
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(reqExp, res)).toBe(true);
    expect(service.addToCache(reqFresh, res)).toBe(true);

    expect(service.getFromCache(reqExp)).toEqual(res);
    expect(service.getFromCache(reqFresh)).toEqual(res);

    await sleep(50);

    service['gcLastRun'] = 0;
    expect(service.runGc()).toBe(true);

    expect(service.getFromCache(reqExp)).toBeUndefined();
    expect(service.getFromCache(reqFresh)).toEqual(res);

    expect(service['gcLock']).toBe(false);
    service['gcLock'] = true;
    expect(service.runGc()).toBe(false);
    service['gcLock'] = false;
  }, 1000);
});

describe('NgHttpCachingService: clearCacheByRegex', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('clearCacheByRegex', () => {
    const req1 = new HttpRequest('GET', 'https://angular.io/docs?foo=regex1');
    const req2 = new HttpRequest('GET', 'https://angular.io/docs?foo=regex2');
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(req1, res)).toBe(true);
    expect(service.addToCache(req2, res)).toBe(true);

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);

    expect(service.clearCacheByRegex(/regex1$/)).toEqual(1);

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toEqual(res);
  });

  it('clearCacheByRegex RegExp object', () => {
    const req1 = new HttpRequest('GET', 'https://angular.io/docs?foo=regex1');
    const req2 = new HttpRequest('GET', 'https://angular.io/docs?foo=regex2');
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(req1, res)).toBe(true);
    expect(service.addToCache(req2, res)).toBe(true);

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);

    expect(service.clearCacheByRegex(new RegExp('regex1$'))).toEqual(1);

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toEqual(res);
  });
});

describe('NgHttpCachingService: clearCacheByKey', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('clearCacheByKey', () => {
    const req1 = new HttpRequest('GET', 'https://angular.io/docs?foo=bykey1');
    const req2 = new HttpRequest('GET', 'https://angular.io/docs?foo=bykey2');
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(req1, res)).toBe(true);
    expect(service.addToCache(req2, res)).toBe(true);

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);

    expect(service.clearCacheByKey('GET@https://angular.io/docs?foo=bykey1')).toBe(true);

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toEqual(res);
  });
});

describe('NgHttpCachingService: clearCacheByTag', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('clearCacheByTag', () => {
    const req1 = new HttpRequest('GET', 'https://angular.io/docs?foo=tag1', null, {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.TAG]: 'foo',
      }),
    });
    const req2 = new HttpRequest('GET', 'https://angular.io/docs?foo=tag2', null, {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.TAG]: 'foo',
      }),
    });
    const req3 = new HttpRequest('GET', 'https://angular.io/docs?foo=notag', null, {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.TAG]: 'bar',
      }),
    });
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(req1, res)).toBe(true);
    expect(service.addToCache(req2, res)).toBe(true);
    expect(service.addToCache(req3, res)).toBe(true);

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);
    expect(service.getFromCache(req3)).toEqual(res);

    expect(service.clearCacheByTag('foo')).toEqual(2);

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toBeUndefined();
    expect(service.getFromCache(req3)).toEqual(res);
  });

  it('clearCacheByTag: matches tags in a comma separated list ignoring surrounding whitespace', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=multi', null, {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.TAG]: 'foo, bar , baz',
      }),
    });
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(req, res)).toBe(true);
    // "bar" has surrounding whitespace in the header and must still match
    expect(service.clearCacheByTag('bar')).toEqual(1);
    expect(service.getFromCache(req)).toBeUndefined();
  });

  it('clearCacheByTag: returns 0 when no entry matches', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=none', null, {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.TAG]: 'foo',
      }),
    });
    expect(service.addToCache(req, new HttpResponse({ body: {} }))).toBe(true);
    expect(service.clearCacheByTag('does-not-exist')).toEqual(0);
  });
});

describe('NgHttpCachingService: checkResponseHeaders lifetime', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching({ checkResponseHeaders: true })],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('caches a response with a positive max-age and expires it accordingly', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=maxage');
    const res = new HttpResponse({
      body: { foo: true },
      headers: new HttpHeaders({ 'cache-control': 'max-age=3600' }),
    });
    const entry: NgHttpCachingEntry = {
      url: req.urlWithParams,
      addedTime: Date.now(),
      response: res,
      request: req,
      version: VERSION.major,
    };
    expect(service.isValid(entry)).toBe(true);
    expect(service.isExpired(entry)).toBe(false);

    // an entry cached more than max-age ago must be expired
    const oldEntry: NgHttpCachingEntry = {
      ...entry,
      addedTime: Date.now() - (NG_HTTP_CACHING_HOUR_IN_MS + NG_HTTP_CACHING_SECOND_IN_MS),
    };
    expect(service.isExpired(oldEntry)).toBe(true);
  });

  it('does not cache a response with max-age=0 (must not live forever)', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=zero');
    const res = new HttpResponse({
      body: { foo: true },
      headers: new HttpHeaders({ 'cache-control': 'max-age=0' }),
    });
    // regression: max-age=0 previously made the entry valid AND never-expiring
    expect(service.addToCache(req, res)).toBe(false);
    expect(service.getFromCache(req)).toBeUndefined();
  });

  it('does not cache a response with no-store', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=nostore');
    const res = new HttpResponse({
      body: { foo: true },
      headers: new HttpHeaders({ 'cache-control': 'no-store' }),
    });
    expect(service.addToCache(req, res)).toBe(false);
  });
});

describe('NgHttpCachingService: default isValid', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('valid', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isValid(cacheEntry)).toBe(true);
  });
});

describe('NgHttpCachingService: override isValid', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    isValid: (entry: NgHttpCachingEntry): boolean => {
      return entry.response.status === 200;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService, { provide: NG_HTTP_CACHING_CONFIG, useValue: config }],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('valid', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=isValid');
    const res = new HttpResponse({ status: 200 });
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=isValid',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: res,
      request: req,
      version: VERSION.major,
    };
    expect(service.isValid(cacheEntry)).toBe(true);
    expect(service.addToCache(req, res)).toBe(true);
  });

  it('invalid', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=isValid');
    const res = new HttpResponse({ status: 500 });
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=isValid',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: res,
      request: req,
      version: VERSION.major,
    };
    expect(service.isValid(cacheEntry)).toBe(false);
    expect(service.addToCache(req, res)).toBe(false);
  });
});

describe('NgHttpCachingService: override isValid return undefined', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isValid: (entry: NgHttpCachingEntry): undefined => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('valid', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + NG_HTTP_CACHING_YEAR_IN_MS,
      response: new HttpResponse({ status: 200 }),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
      version: VERSION.major,
    };
    expect(service.isValid(cacheEntry)).toBe(true);
  });
});

describe('NgHttpCachingService: deep freeze', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deepFreeze: DEV', () => {
    try {
      const req = new HttpRequest('GET', 'https://angular.io/docs?foo=isValid');
      const res = new HttpResponse({ status: 200, body: { count: 1 } });
      expect(service.addToCache(req, res)).toBe(true);
      service['devMode'] = true;
      expect(service['devMode']).toEqual(true);
      const state = service.getFromCache(req);
      expect(state?.body).toEqual({ count: 1 });
      (state?.body as any).count = 2;
      expect(true).toEqual(false);
    } catch (error: any) {
      expect(error.message).toEqual(
        "Cannot assign to read only property 'count' of object '#<Object>'",
      );
    } finally {
      service['devMode'] = true;
      expect(service['devMode']).toEqual(true);
    }
  });
});

describe('NgHttpCachingService: context and edge cases', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('withNgHttpCachingContext with default context', () => {
    const context = withNgHttpCachingContext({ getKey: () => 'test' });
    expect(context.get(NG_HTTP_CACHING_CONTEXT).getKey!({} as any)).toBe('test');
  });

  it('checkCacheHeaders coverage', () => {
    expect(checkCacheHeaders(new HttpHeaders({ 'cache-control': 'public, max-age=3600' }))).toBe(
      3600000,
    );
    expect(checkCacheHeaders(new HttpHeaders({ expires: 'invalid' }))).toBe(true);
  });

  it('checkCacheHeaders: no-store and no-cache are not cacheable', () => {
    expect(checkCacheHeaders(new HttpHeaders({ 'cache-control': 'no-store' }))).toBe(false);
    expect(checkCacheHeaders(new HttpHeaders({ 'cache-control': 'no-cache' }))).toBe(false);
  });

  it('checkCacheHeaders: max-age=0 is not cacheable (must not be cached forever)', () => {
    // `max-age=0` means immediately stale: it must NOT be interpreted as the
    // "0 = never expire" lifetime sentinel.
    expect(checkCacheHeaders(new HttpHeaders({ 'cache-control': 'public, max-age=0' }))).toBe(
      false,
    );
  });

  it('checkCacheHeaders: no headers default to cacheable', () => {
    expect(checkCacheHeaders(new HttpHeaders())).toBe(true);
  });

  it('checkCacheHeaders: expired Expires header is not cacheable', () => {
    const past = new Date(Date.now() - NG_HTTP_CACHING_HOUR_IN_MS).toUTCString();
    expect(checkCacheHeaders(new HttpHeaders({ expires: past }))).toBe(false);
  });

  it('checkCacheHeaders: future Expires header is cacheable', () => {
    const future = new Date(Date.now() + NG_HTTP_CACHING_HOUR_IN_MS).toUTCString();
    expect(checkCacheHeaders(new HttpHeaders({ expires: future }))).toBe(true);
  });

  it('isExpired: HttpContext override', () => {
    const context = withNgHttpCachingContext({ isExpired: () => true });
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io', { context }),
      version: VERSION.major,
    };
    expect(service.isExpired(cacheEntry)).toBe(true);
  });

  it('isCacheable: HttpContext override', () => {
    const context = withNgHttpCachingContext({ isCacheable: () => false });
    const httpRequest = new HttpRequest('GET', 'https://angular.io', { context });
    expect(service.isCacheable(httpRequest)).toBe(false);
  });

  it('isValid: HttpContext override', () => {
    const context = withNgHttpCachingContext({ isValid: () => false });
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io', { context }),
      version: VERSION.major,
    };
    expect(service.isValid(cacheEntry)).toBe(false);
  });

  it('getKey: HttpContext override', () => {
    const context = withNgHttpCachingContext({ getKey: () => 'custom-key' });
    const httpRequest = new HttpRequest('GET', 'https://angular.io', { context });
    expect(service.getKey(httpRequest)).toBe('custom-key');
  });
});

describe('NgHttpCachingService: sentinel detection', () => {
  class MockAdapter implements NgHttpCachingStorageInterface {
    size = 0;
    get = () => undefined;
    set = () => {};
    delete = () => true;
    clear = () => {};
    forEach = () => {};
    has = () => false;
  }

  it('should inject adapter from sentinel', () => {
    const sentinel = new NgHttpCachingNgSimpleStateSentinel(MockAdapter);
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching({ store: sentinel }), MockAdapter],
    });
    const service = TestBed.inject(NgHttpCachingService);
    expect(service.getStore()).toBeInstanceOf(MockAdapter);
  });
});

describe('NgHttpCachingService: clearCacheByMutation', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
    service.clearCache();
  });

  it('strategy NONE', () => {
    const httpRequest = new HttpRequest('POST' as any, 'https://angular.io/api/users');
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users'),
      new HttpResponse({}),
    );
    expect(service.getStore().size).toBe(1);

    // Default is NONE
    service.clearCacheByMutation(httpRequest);
    expect(service.getStore().size).toBe(1);
  });

  it('strategy ALL', () => {
    const config: NgHttpCachingConfig = { clearCacheOnMutation: NgHttpCachingMutationStrategy.ALL };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
    service.clearCache();

    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users'),
      new HttpResponse({}),
    );
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/other'),
      new HttpResponse({}),
    );
    expect(service.getStore().size).toBe(2);

    service.clearCacheByMutation(new HttpRequest('POST' as any, 'https://angular.io/api/users'));
    expect(service.getStore().size).toBe(0);
  });

  it('strategy IDENTICAL', () => {
    const config: NgHttpCachingConfig = {
      clearCacheOnMutation: NgHttpCachingMutationStrategy.IDENTICAL,
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
    service.clearCache();

    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users'),
      new HttpResponse({}),
    );
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users', null, { params: { id: '1' } as any }),
      new HttpResponse({}),
    );
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/other'),
      new HttpResponse({}),
    );
    expect(service.getStore().size).toBe(3);

    service.clearCacheByMutation(new HttpRequest('POST' as any, 'https://angular.io/api/users'));
    // Should clear both /api/users and /api/users?id=1 but NOT /api/other
    expect(service.getStore().size).toBe(1);
    expect(service.getStore().has('GET@https://angular.io/api/other')).toBe(true);
  });

  it('strategy COLLECTION', () => {
    const config: NgHttpCachingConfig = {
      clearCacheOnMutation: NgHttpCachingMutationStrategy.COLLECTION,
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
    service.clearCache();

    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users'),
      new HttpResponse({}),
    );
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users/24'),
      new HttpResponse({}),
    );
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/other'),
      new HttpResponse({}),
    );
    expect(service.getStore().size).toBe(3);

    service.clearCacheByMutation(
      new HttpRequest('DELETE' as any, 'https://angular.io/api/users/24'),
    );
    // Should clear /api/users/24 AND /api/users
    expect(service.getStore().size).toBe(1);
    expect(service.getStore().has('GET@https://angular.io/api/other')).toBe(true);
  });

  it('custom function strategy', () => {
    const config: NgHttpCachingConfig = {
      clearCacheOnMutation: (req) => req.url.includes('users'),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
    service.clearCache();

    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users'),
      new HttpResponse({}),
    );
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/other'),
      new HttpResponse({}),
    );

    service.clearCacheByMutation(new HttpRequest('POST' as any, 'https://angular.io/api/users'));
    expect(service.getStore().size).toBe(0); // My mock logic for function strategy returns 'ALL' if true

    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/other'),
      new HttpResponse({}),
    );
    service.clearCacheByMutation(new HttpRequest('POST' as any, 'https://angular.io/api/products'));
    expect(service.getStore().size).toBe(1);
  });

  it('boolean shortcut true (ALL)', () => {
    const config: NgHttpCachingConfig = { clearCacheOnMutation: true };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
    service.clearCache();

    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/users'),
      new HttpResponse({}),
    );
    service.clearCacheByMutation(new HttpRequest('POST' as any, 'https://angular.io/api/other'));
    expect(service.getStore().size).toBe(0);
  });
});

describe('NgHttpCachingService: entry with a corrupted lifetime', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  const requestWithLifetime = (lifetime: string): HttpRequest<null> =>
    new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
      headers: new HttpHeaders({ [NgHttpCachingHeaders.LIFETIME]: lifetime }),
    });

  it('should not enter the cache', () => {
    for (const lifetime of ['test', '-1']) {
      const req = requestWithLifetime(lifetime);
      expect(service.addToCache(req, new HttpResponse({ status: 200 }))).toBe(false);
      expect(service.getStore().size).toBe(0);
    }
  });

  it('runGc should drop it instead of throwing', () => {
    // simulate an entry stored by a previous version (or a persistent store)
    const req = requestWithLifetime('test');
    service.getStore().set(service.getKey(req), {
      url: req.urlWithParams,
      response: new HttpResponse({ status: 200 }),
      request: req,
      addedTime: Date.now(),
      version: VERSION.major,
    });
    expect(service.getStore().size).toBe(1);

    // bypass the 1s throttle set by the runGc() call in the constructor
    (service as unknown as { gcLastRun: number }).gcLastRun = 0;
    expect(() => service.runGc()).not.toThrow();
    expect(service.getStore().size).toBe(0);
  });
});

describe('NgHttpCachingService: ALL combined with other allowed methods', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching({ allowedMethod: ['ALL', 'GET'] })],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should allow every method when ALL is present', () => {
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']) {
      expect(service.isCacheable(new HttpRequest(method, 'https://angular.io/docs', null))).toBe(
        true,
      );
    }
  });
});

describe('NgHttpCachingService: default config store', () => {
  it('should not share the store instance between spreads of the defaults', () => {
    const configA = { ...NgHttpCachingConfigDefault };
    const configB = { ...NgHttpCachingConfigDefault };
    expect(configA.store).not.toBe(configB.store);
    expect(configA.store).not.toBe(NgHttpCachingConfigDefault.store);
  });
});

describe('NgHttpCachingService: cached response is still usable', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching()],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be able to read the lazily initialized headers of a cached response', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?lazy-headers');
    // this is how a real backend builds them: lazily, from the raw header string
    const res = new HttpResponse({
      status: 200,
      body: { a: 1 },
      headers: new HttpHeaders('x-foo: bar'),
    });
    expect(service.addToCache(req, res)).toBe(true);

    const cached = service.getFromCache(req);
    expect(cached).toBeTruthy();
    expect(cached?.headers.get('x-foo')).toBe('bar');
  });

  it('should still make the body immutable', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?immutable-body');
    const res = new HttpResponse({ status: 200, body: { a: 1, nested: { b: 2 } } });
    expect(service.addToCache(req, res)).toBe(true);

    const cached = service.getFromCache<unknown, { a: number; nested: { b: number } }>(req);
    expect(Object.isFrozen(cached?.body)).toBe(true);
    expect(Object.isFrozen(cached?.body?.nested)).toBe(true);
  });
});

describe('NgHttpCachingService: expires header drives the lifetime', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching({ checkResponseHeaders: true })],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  const entryWithExpires = (expiresOffset: number, addedOffset = 0): NgHttpCachingEntry => {
    const url = 'https://angular.io/docs?expires';
    return {
      url,
      addedTime: Date.now() + addedOffset,
      response: new HttpResponse({
        status: 200,
        headers: new HttpHeaders({ expires: new Date(Date.now() + expiresOffset).toUTCString() }),
      }),
      request: new HttpRequest('GET', url),
      version: VERSION.major,
    };
  };

  it('should not be expired before the expires date', () => {
    expect(service.isExpired(entryWithExpires(NG_HTTP_CACHING_MINUTE_IN_MS))).toBe(false);
  });

  it('should be expired after the expires date, ignoring the default lifetime', () => {
    // stored 2s ago with an expires date 1s in the future of the storing time
    expect(
      service.isExpired(
        entryWithExpires(-NG_HTTP_CACHING_SECOND_IN_MS, -2 * NG_HTTP_CACHING_SECOND_IN_MS),
      ),
    ).toBe(true);
  });

  it('should be expired when already stale at storing time', () => {
    expect(service.isExpired(entryWithExpires(-NG_HTTP_CACHING_MINUTE_IN_MS))).toBe(true);
  });

  it('cache-control should take precedence over expires', () => {
    const url = 'https://angular.io/docs?expires-and-cache-control';
    const entry: NgHttpCachingEntry = {
      url,
      addedTime: Date.now(),
      response: new HttpResponse({
        status: 200,
        headers: new HttpHeaders({
          'cache-control': 'max-age=3600',
          expires: new Date(Date.now() - NG_HTTP_CACHING_YEAR_IN_MS).toUTCString(),
        }),
      }),
      request: new HttpRequest('GET', url),
      version: VERSION.major,
    };
    expect(service.isExpired(entry)).toBe(false);
  });
});

describe('NgHttpCachingService: function mutation strategy is limited to mutations', () => {
  let service: NgHttpCachingService;
  let calls: string[];

  beforeEach(() => {
    calls = [];
    const config: NgHttpCachingConfig = {
      allowedMethod: ['ALL'],
      clearCacheOnMutation: (req) => {
        calls.push(req.method);
        return req.url.includes('/api/critical-data');
      },
    };
    TestBed.configureTestingModule({
      providers: [provideNgHttpCaching(config)],
    });
    service = TestBed.inject(NgHttpCachingService);
    service.clearCache();
  });

  const seed = (): void => {
    service.addToCache(
      new HttpRequest('GET', 'https://angular.io/api/critical-data'),
      new HttpResponse({ status: 200 }),
    );
  };

  it('should not be consulted for a GET', () => {
    seed();
    expect(
      service.clearCacheByMutation(new HttpRequest('GET', 'https://angular.io/api/critical-data')),
    ).toBe(false);
    expect(calls).toEqual([]);
    expect(service.getStore().size).toBe(1);
  });

  it('should be consulted for every mutation method', () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      seed();
      expect(
        service.clearCacheByMutation(
          new HttpRequest(method, 'https://angular.io/api/critical-data', null),
        ),
      ).toBe(true);
      expect(service.getStore().size).toBe(0);
    }
    expect(calls).toEqual(['POST', 'PUT', 'DELETE', 'PATCH']);
  });

  it('should not clear when the function returns false', () => {
    seed();
    expect(
      service.clearCacheByMutation(new HttpRequest('POST', 'https://angular.io/api/other', null)),
    ).toBe(false);
    expect(service.getStore().size).toBe(1);
  });
});
