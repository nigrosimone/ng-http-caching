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

  it('ADD and GET and DELETE', () => {
    const req = new HttpRequest('GET', 'https://angular.io/docs?foo=bar');
    const res = new HttpResponse({ body: { foo: true } });
    service.addToCache(req, res);
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
