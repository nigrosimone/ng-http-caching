import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse, HttpHeaders } from '@angular/common/http';
import {
  NgxHttpCachingService,
  NGX_HTTP_CACHE_CONFIG,
  NgxCacheConfigDefault,
  NgxHttpCachingConfig,
  NgxHttpCachingEntry,
  NgxHttpCachingStrategy,
  NgxHttpCachingHeaders,
} from './ng-http-caching.service';


describe('NgxHttpCachingService: no config', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxHttpCachingService],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have: default value', () => {
    expect(service.getConfig()).toEqual(NgxCacheConfigDefault);
  });
});

describe('NgxHttpCachingService: empty config', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: {} },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have: default value', () => {
    expect(service.getConfig()).toEqual(NgxCacheConfigDefault);
  });
});

describe('NgxHttpCachingService: override config', () => {
  let service: NgxHttpCachingService;
  const config: NgxHttpCachingConfig = {
    lifetime: 10,
    allowedMethod: ['POST'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have: override value', () => {
    expect(service.getConfig().lifetime).not.toEqual(
      NgxCacheConfigDefault.lifetime
    );
    expect(service.getConfig().allowedMethod).not.toEqual(
      NgxCacheConfigDefault.allowedMethod
    );
    expect(service.getConfig().lifetime).toEqual(config.lifetime);
    expect(service.getConfig().allowedMethod).toEqual(config.allowedMethod);
  });
});

describe('NgxHttpCachingService: default getKey', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxHttpCachingService],
    });
    service = TestBed.inject(NgxHttpCachingService);
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

describe('NgxHttpCachingService: override getKey', () => {
  let service: NgxHttpCachingService;

  const config: NgxHttpCachingConfig = {
    getKey: (req: HttpRequest<any>): string => {
      return req.method + req.urlWithParams;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
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

describe('NgxHttpCachingService: override getKey return undefined', () => {
  let service: NgxHttpCachingService;

  const config: NgxHttpCachingConfig = {
    getKey: (req: HttpRequest<any>): string => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
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

describe('NgxHttpCachingService: default isCacheable', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxHttpCachingService],
    });
    service = TestBed.inject(NgxHttpCachingService);
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

describe('NgxHttpCachingService: default isCacheable allow ALL', () => {
  let service: NgxHttpCachingService;
  const config: NgxHttpCachingConfig = {
    allowedMethod: ['ALL']
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
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

describe('NgxHttpCachingService: override isCacheable', () => {
  let service: NgxHttpCachingService;

  const config: NgxHttpCachingConfig = {
    isCacheable: (req: HttpRequest<any>): boolean => {
      // cacheable only if without queryparameters
      return req.urlWithParams.indexOf('?') === -1;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
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

describe('NgxHttpCachingService: override isCacheable return undefined', () => {
  let service: NgxHttpCachingService;

  const config: NgxHttpCachingConfig = {
    isCacheable: (req: HttpRequest<any>): boolean => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
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

describe('NgxHttpCachingService: isCacheable strategy DISALLOW_ALL', () => {
  let service: NgxHttpCachingService;

  const config: NgxHttpCachingConfig = {
    cacheStrategy: NgxHttpCachingStrategy.DISALLOW_ALL,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
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
      [NgxHttpCachingHeaders.ALLOW_CACHE]: '1',
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

describe('NgxHttpCachingService: isCacheable strategy ALLOW_ALL', () => {
  let service: NgxHttpCachingService;

  const config: NgxHttpCachingConfig = {
    cacheStrategy: NgxHttpCachingStrategy.ALLOW_ALL,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
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
      [NgxHttpCachingHeaders.DISALLOW_CACHE]: '1',
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

describe('NgxHttpCachingService: default isExpired', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxHttpCachingService],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });

  it('expired', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });
});

describe('NgxHttpCachingService: override isExpired', () => {
  let service: NgxHttpCachingService;
  const config: NgxHttpCachingConfig = {
    isExpired: (entry: NgxHttpCachingEntry): boolean => {
      return true;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired 1', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });

  it('expired 2', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });
});

describe('NgxHttpCachingService: override isExpired return undefined', () => {
  let service: NgxHttpCachingService;
  const config: NgxHttpCachingConfig = {
    isExpired: (entry: NgxHttpCachingEntry): boolean => {
      return undefined;
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });

  it('not expired', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });
});

describe('NgxHttpCachingService: default isExpired with long lifetime', () => {
  let service: NgxHttpCachingService;
  const config: NgxHttpCachingConfig = {
    lifetime: 1000 * 60 * 60 * 24 * 365 * 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired 1', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() + 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });

  it('not expired 2', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });
});

describe('NgxHttpCachingService: default isExpired with infinite lifetime', () => {
  let service: NgxHttpCachingService;
  const config: NgxHttpCachingConfig = {
    lifetime: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('not expired', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar'),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });
});

describe('NgxHttpCachingService: default isExpired with request lifetime', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxHttpCachingService],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('expired', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now() - 1000 * 60 * 60 * 24 * 365 * 2,
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgxHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(),
        }),
      }),
    };
    expect(service.isExpired(cacheEntry)).toBeTrue();
  });

  it('not expired', () => {
    const cacheEntry: NgxHttpCachingEntry = {
      url: 'https://angular.io/docs?foo=bar',
      addedTime: Date.now(),
      response: new HttpResponse({}),
      request: new HttpRequest('GET', 'https://angular.io/docs?foo=bar', null, {
        headers: new HttpHeaders({
          [NgxHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(),
        }),
      }),
    };
    expect(service.isExpired(cacheEntry)).toBeFalse();
  });
});

describe('NgxHttpCachingService: ADD and GET and DELETE', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxHttpCachingService],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('ADD and GET and DELETE', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    const res = new HttpResponse({ body: { foo: true } });
    service.addToCache(req, res);
    expect(service.getFromCache(req)).toEqual(res);
    expect(service.deleteFromCache(req)).toBeTrue();
    expect(service.getFromCache(req)).toBeUndefined();
  });
});

describe('NgxHttpCachingService: get default config', () => {
  let service: NgxHttpCachingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxHttpCachingService],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('default', () => {
    expect(service.getConfig()).toEqual(NgxCacheConfigDefault);
  });
});

describe('NgxHttpCachingService: get override config', () => {
  let service: NgxHttpCachingService;
  const config: NgxHttpCachingConfig = {
    lifetime: 0,
    allowedMethod: ['POST'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NgxHttpCachingService,
        { provide: NGX_HTTP_CACHE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(NgxHttpCachingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('override', () => {
    expect(service.getConfig().lifetime).toEqual(config.lifetime);
    expect(service.getConfig().allowedMethod).toEqual(config.allowedMethod);
  });
});
