import { Component, OnInit } from '@angular/core';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingConfig,
  NgHttpCachingHeadersList,
  withNgHttpCachingContext
} from '../../../ng-http-caching/src/public-api';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

interface CachedKey {
  key: string;
  headers: { [key: string]: string }[];
  status: 'cached' | 'queue';
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  public url = 'https://my-json-server.typicode.com/typicode/demo/db';
  public key = 'GET@' + this.url;
  public tag = '';
  public regex: string = '';
  public cachedKeys: CachedKey[] = [];
  public timeSpan: number | null = null;
  public nocache = false;
  public lifetime = null;
  public count = 0;
  public typeOfRequests = ['PARALLEL', 'SEQUENTIAL', 'NESTED'];
  public typeOfRequest = this.typeOfRequests[0];

  private config: NgHttpCachingConfig;

  constructor(
    private ngHttpCachingService: NgHttpCachingService,
    private http: HttpClient
  ) {
    this.config = this.ngHttpCachingService.getConfig();
  }

  ngOnInit(): void {
    this.updateCachedKeys();
  }

  async getRequest(): Promise<void> {
    this.timeSpan = null;
    this.count = 0;
    const timeStart = new Date();

    let headers = new HttpHeaders();
    if (this.tag) {
      headers = headers.set(NgHttpCachingHeaders.TAG, this.tag);
    }
    if (this.nocache) {
      headers = headers.set(NgHttpCachingHeaders.DISALLOW_CACHE, '1');
    }
    if (this.lifetime && Number(this.lifetime) !== this.config.lifetime) {
      headers = headers.set(NgHttpCachingHeaders.LIFETIME, this.lifetime);
    }

    const context = withNgHttpCachingContext({
      isExpired: () => {
        console.log('context:isExpired');
      },
      isCacheable: () => {
        console.log('context:isCacheable');
      },
      getKey: () => {
        console.log('context:getKey');
      },
      isValid: () => {
        console.log('context:isValid');
      }
    });

    switch (this.typeOfRequest) {
      case 'SEQUENTIAL': {
        // test sequential requests
        const result1 = await lastValueFrom(
          this.http.get(this.url, { headers, context })
        );
        console.log('Sequential response 1', result1);
        this.count++;
        const result2 = await lastValueFrom(
          this.http.get(this.url, { headers, context })
        );
        console.log('Sequential response 2', result2);
        this.count++;
        this.timeSpan = new Date().getTime() - timeStart.getTime();
        this.updateCachedKeys();
        break;
      }
      case 'PARALLEL': {
        // test parallel requests
        const results = await Promise.all([
          lastValueFrom(this.http.get(this.url, { headers, context })),
          lastValueFrom(this.http.get(this.url, { headers, context })),
        ]);
        this.count++;
        this.count++;
        this.timeSpan = new Date().getTime() - timeStart.getTime();
        this.updateCachedKeys();
        console.log('Parallel responses', results);
        break;
      }
      case 'NESTED': {
        // test nested requests
        this.http.get(this.url, { headers, context }).subscribe((result1) => {
          console.log('Nested response 1', result1);
          this.count++;
          this.http.get(this.url, { headers, context }).subscribe((result2) => {
            console.log('Nested response 2', result2);
            this.count++;
            this.timeSpan = new Date().getTime() - timeStart.getTime();
            this.updateCachedKeys();
          });
        });
        break;
      }
    }
  }

  clearCache(): void {
    this.ngHttpCachingService.clearCache();
    this.updateCachedKeys();
  }

  clearCacheByTag(): void {
    this.ngHttpCachingService.clearCacheByTag(this.tag);
    this.updateCachedKeys();
  }

  clearCacheByRegex(): void {
    this.ngHttpCachingService.clearCacheByRegex(new RegExp(this.regex));
    this.updateCachedKeys();
  }

  clearCacheByKey(): void {
    this.ngHttpCachingService.clearCacheByKey(this.key);
    this.updateCachedKeys();
  }

  updateCachedKeys(): void {
    const keys: CachedKey[] = [];

    this.ngHttpCachingService.getStore().forEach((value, key) => {
      const headers: Array<Record<string, string>> = [];
      NgHttpCachingHeadersList.forEach(
        (ngHttpCachingHeaders: NgHttpCachingHeaders) => {
          if (value.request.headers.has(ngHttpCachingHeaders)) {
            headers.push({
              [ngHttpCachingHeaders]:
                value.request.headers.get(ngHttpCachingHeaders) as string,
            });
          }
        }
      );
      keys.push({ key, headers, status: 'cached' });
    });
    this.ngHttpCachingService.getQueue().forEach((_, key) => {
      keys.push({ key, headers: [], status: 'queue' });
    });
    this.cachedKeys = keys;

    setTimeout(() => this.updateCachedKeys(), 100);
  }

  trackByCachedKey(_: number, cachedKey: CachedKey): string {
    return cachedKey.key + '@' + cachedKey.status;
  }
}
