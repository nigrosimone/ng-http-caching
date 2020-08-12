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
} from './ng-http-caching.service';


describe('NgHttpCachingService: no config', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
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

describe('NgHttpCachingService: empty config', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: {} },
      ],
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
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have: override value', () => {
    expect(service.getConfig().lifetime).not.toEqual(
      NgHttpCachingConfigDefault.lifetime
    );
    expect(service.getConfig().allowedMethod).not.toEqual(
      NgHttpCachingConfigDefault.allowedMethod
    );
    expect(service.getConfig().lifetime).toEqual(config.lifetime);
    expect(service.getConfig().allowedMethod).toEqual(config.allowedMethod);
  });
});

describe('NgHttpCachingService: getStore()', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
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
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', keyUrl),
    };
    store.set(keyUrl, cacheEntry);
    expect(store.has(keyUrl)).toBeTrue();
    expect(store.delete(keyUrl)).toBeTrue();
    expect(store.has(keyUrl)).toBeFalse();
  });
});

describe('NgHttpCachingService: getQueue()', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
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
      providers: [NgHttpCachingService],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('default key is url with params', () => {
    const urlWithParams = 'https://angular.io/docs?foo=bar';
    const httpRequest = new HttpRequest('GET', urlWithParams);
    expect(service.getKey(httpRequest)).toEqual(urlWithParams);
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
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
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
    getKey: (req: HttpRequest<any>): string => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('override key is url with params', () => {
    const urlWithParams = 'https://angular.io/docs?foo=bar';
    const httpRequest = new HttpRequest('GET', urlWithParams);
    expect(service.getKey(httpRequest)).toEqual(urlWithParams);
  });
});

describe('NgHttpCachingService: default isCacheable', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET is cacheable', () => {
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar'
    );
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });

  it('DELETE isn\'t cacheable', () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBeFalse();
  });
});

describe('NgHttpCachingService: default isCacheable allow ALL', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    allowedMethod: ['ALL']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET is cacheable', () => {
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar'
    );
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });

  it('DELETE is cacheable', () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });
});

describe('NgHttpCachingService: default isCacheable allow two', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    allowedMethod: ['GET', 'DELETE']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET is cacheable', () => {
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar'
    );
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });

  it('DELETE is cacheable', () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });
});

describe('NgHttpCachingService: override isCacheable', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    isCacheable: (req: HttpRequest<any>): boolean => {
      // cacheable only if without queryparameters
      return req.urlWithParams.indexOf('?') === -1;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET with query parameters isn\'t cacheable', () => {
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar'
    );
    expect(service.isCacheable(httpRequest)).toBeFalse();
  });

  it('GET without query parameters is cacheable', () => {
    const httpRequest = new HttpRequest('GET', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });
});

describe('NgHttpCachingService: override isCacheable return undefined', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    isCacheable: (req: HttpRequest<any>): boolean => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('cacheable', () => {
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar'
    );
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });

  it('don\'t cacheable', () => {
    const httpRequest = new HttpRequest('DELETE', 'https://angular.io/docs');
    expect(service.isCacheable(httpRequest)).toBeFalse();
  });
});

describe('NgHttpCachingService: isCacheable strategy DISALLOW_ALL', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    cacheStrategy: NgHttpCachingStrategy.DISALLOW_ALL,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET without allow header ins\'t cacheable', () => {
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar'
    );
    expect(service.isCacheable(httpRequest)).toBeFalse();
  });

  it('GET with allow header is cacheable', () => {
    const headers = new HttpHeaders({
      [NgHttpCachingHeaders.ALLOW_CACHE]: '1',
    });
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar',
      null,
      { headers }
    );
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });
});

describe('NgHttpCachingService: isCacheable strategy ALLOW_ALL', () => {
  let service: NgHttpCachingService;

  const config: NgHttpCachingConfig = {
    cacheStrategy: NgHttpCachingStrategy.ALLOW_ALL,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GET without disallow header is cacheable', () => {
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar'
    );
    expect(service.isCacheable(httpRequest)).toBeTrue();
  });

  it('GET with disallow header isn\'t cacheable', () => {
    const headers = new HttpHeaders({
      [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
    });
    const httpRequest = new HttpRequest(
      'GET',
      'https://angular.io/docs?foo=bar',
      null,
      { headers }
    );
    expect(service.isCacheable(httpRequest)).toBeFalse();
  });
});

describe('NgHttpCachingService: default isExpired', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });

  it('expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });

});

describe('NgHttpCachingService: override isExpired', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    isExpired: (entry: NgHttpCachingEntry): boolean => {
      return true;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired 1', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });

  it('expired 2', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });
});

describe('NgHttpCachingService: override isExpired return undefined', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    isExpired: (entry: NgHttpCachingEntry): boolean => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });
});

describe('NgHttpCachingService: default isExpired with long lifetime', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    lifetime: 1000 * 60 * 60 * 24 * 365 * 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired 1', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });

  it('not expired 2', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });
});

describe('NgHttpCachingService: default isExpired with infinite lifetime', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    lifetime: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });
});

describe('NgHttpCachingService: default isExpired with request lifetime', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365 * 2,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(),
        }),
      }),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });

  it('not expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(),
        }),
      }),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });

  it('wrong expired', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgHttpCachingHeaders.LIFETIME]: '-1',
        }),
      }),
    };
    expect(() => service.isExpired(cacheEntry)).toThrow(new Error('lifetime must be greater than or equal 0'));
  });
});

describe('NgHttpCachingService: ADD and GET and DELETE', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('ADD and GET expired', (done) => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.LIFETIME]: '10',
      }),
    });
    const res = new HttpResponse({ body: { foo: true } });
    expect(service.addToCache(req, res)).toBeTrue();
    expect(service.getFromCache(req)).toEqual(res);

    setTimeout(() => {
      expect(service.getFromCache(req)).toBeUndefined();
      done();
    }, 50);

  }, 1000);

  it('ADD and GET and DELETE', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    const res = new HttpResponse({ body: { foo: true } });
    expect(service.addToCache(req, res)).toBeTrue();
    expect(service.getFromCache(req)).toEqual(res);
    expect(service.deleteFromCache(req)).toBeTrue();
    expect(service.getFromCache(req)).toBeUndefined();
  });
});

describe('NgHttpCachingService: get default config', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgHttpCachingService],
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
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
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
      providers: [NgHttpCachingService],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('after clearCache no cached entry', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    const res = new HttpResponse({ body: { foo: true } });
    expect(service.addToCache(req, res)).toBeTrue();
    expect(service.getFromCache(req)).toEqual(res);
    service.clearCache();
    expect(service.getFromCache(req)).toBeUndefined();
  });
});


describe('NgHttpCachingService: runGc', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('after runGc no cached entry', (done) => {
    const reqExp = new HttpRequest('GET', 'https://angular.io/docs?foo=expired', {
      headers: new HttpHeaders({
        [NgHttpCachingHeaders.LIFETIME]: '1',
      }),
    });
    const reqFresh = new HttpRequest('GET', 'https://angular.io/docs?foo=fresh');
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(reqExp, res)).toBeTrue();
    expect(service.addToCache(reqFresh, res)).toBeTrue();

    expect(service.getFromCache(reqExp)).toEqual(res);
    expect(service.getFromCache(reqFresh)).toEqual(res);

    setTimeout(() => {
      service.runGc();

      expect(service.getFromCache(reqExp)).toBeUndefined();
      expect(service.getFromCache(reqFresh)).toEqual(res);

      done();
    }, 50);
  }, 1000);
});

describe('NgHttpCachingService: clearCacheByRegex', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService
      ],
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

    expect(service.addToCache(req1, res)).toBeTrue();
    expect(service.addToCache(req2, res)).toBeTrue();

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);

    service.clearCacheByRegex(/regex1$/);

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toEqual(res);

  });

  it('clearCacheByRegex RegExp object', () => {
    const req1 = new HttpRequest('GET', 'https://angular.io/docs?foo=regex1');
    const req2 = new HttpRequest('GET', 'https://angular.io/docs?foo=regex2');
    const res = new HttpResponse({ body: { foo: true } });

    expect(service.addToCache(req1, res)).toBeTrue();
    expect(service.addToCache(req2, res)).toBeTrue();

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);

    service.clearCacheByRegex(new RegExp('regex1$'));

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toEqual(res);

  });
});

describe('NgHttpCachingService: clearCacheByKey', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService
      ],
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

    expect(service.addToCache(req1, res)).toBeTrue();
    expect(service.addToCache(req2, res)).toBeTrue();

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);

    expect(service.clearCacheByKey('https://angular.io/docs?foo=bykey1')).toBeTrue();

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toEqual(res);

  });
});


describe('NgHttpCachingService: clearCacheByTag', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService
      ],
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

    expect(service.addToCache(req1, res)).toBeTrue();
    expect(service.addToCache(req2, res)).toBeTrue();
    expect(service.addToCache(req3, res)).toBeTrue();

    expect(service.getFromCache(req1)).toEqual(res);
    expect(service.getFromCache(req2)).toEqual(res);
    expect(service.getFromCache(req3)).toEqual(res);

    service.clearCacheByTag('foo');

    expect(service.getFromCache(req1)).toBeUndefined();
    expect(service.getFromCache(req2)).toBeUndefined();
    expect(service.getFromCache(req3)).toEqual(res);

  });

});

describe('NgHttpCachingService: default isValid', () => {
  let service: NgHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('valid', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isValid(cacheEntry)).toBeTrue();
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
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('valid', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=isValid');
    const res = new HttpResponse({status: 200});
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=isValid',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: res,
      request: req,
    };
    expect(service.isValid(cacheEntry)).toBeTrue();
    expect(service.addToCache(req, res)).toBeTrue();
  });

  it('invalid', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=isValid');
    const res = new HttpResponse({status: 500});
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=isValid',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: res,
      request: req,
    };
    expect(service.isValid(cacheEntry)).toBeFalse();
    expect(service.addToCache(req, res)).toBeFalse();
  });
});

describe('NgHttpCachingService: override isValid return undefined', () => {
  let service: NgHttpCachingService;
  const config: NgHttpCachingConfig = {
    isValid: (entry: NgHttpCachingEntry): undefined => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgHttpCachingService,
        { provide: NG_HTTP_CACHING_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('valid', () => {
    const cacheEntry: NgHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({status: 200}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isValid(cacheEntry)).toBeTrue();
  });

});
