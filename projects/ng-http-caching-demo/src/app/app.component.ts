import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingConfig,
  NgHttpCachingHeadersList
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
export class AppComponent implements OnInit, OnDestroy {
  public url = 'https://my-json-server.typicode.com/typicode/demo/db';
  public key = 'GET@' + this.url;
  public tag = '';
  public regex = '';
  public cachedKeys: CachedKey[] = [];
  public timeSpan = 0;
  public nocache = false;
  public lifetime = null;
  public count = 0;

  private config: NgHttpCachingConfig;
  private timerUpdateCachedKeys = 0;

  constructor(

    private ngHttpCachingService: NgHttpCachingService,

    private http: HttpClient
  ) {
    this.config = this.ngHttpCachingService.getConfig();
    this.lifetime = null;
  }

  ngOnInit(): void {
    this.timerUpdateCachedKeys = window.setInterval(() => this.updateCachedKeys(), 100);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerUpdateCachedKeys);
  }


  async getRequest(): Promise<void> {
    this.timeSpan = 0;
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
    console.log('pre-request');
    // test sequential requests
    const result1 = await lastValueFrom(this.http.get(this.url, { headers }));
    console.log('Sequential response 1', result1);
    this.count++;
    const result2 = await lastValueFrom(this.http.get(this.url, { headers }));
    console.log('Sequential response 2', result2);
    this.count++;

    // test parallel request
    const results = await Promise.all([
      lastValueFrom(this.http.get(this.url, { headers })),
      lastValueFrom(this.http.get(this.url, { headers })),
    ]);
    this.count++;
    this.count++;
    console.log('Parallel responses', results);

    // test nested request
    this.http.get(this.url, { headers }).subscribe((result1) => {
      console.log('Nested response 1', result1);
      this.count++;
      this.http.get(this.url, { headers }).subscribe((result2) => {
        console.log('Nested response 2', result2);
        this.count++;

        this.timeSpan = new Date().getTime() - timeStart.getTime();
        this.updateCachedKeys();
      });
    });
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
      const headers: { [key: string]: string }[] = [];
      NgHttpCachingHeadersList.forEach((ngHttpCachingHeaders: string) => {
        if (value.request.headers.has(ngHttpCachingHeaders)) {
          headers.push({
            [ngHttpCachingHeaders]: value.request.headers.get(
              ngHttpCachingHeaders
            ) as string,
          });
        }
      });
      keys.push({ key, headers, status: 'cached' });
    });
    this.ngHttpCachingService.getQueue().forEach((value, key) => {
      keys.push({ key, headers: [], status: 'queue' });
    });
    this.cachedKeys = keys;
  }

  trackByCachedKey(index: number, cachedKey: CachedKey): string {
    return cachedKey.key + '@' + cachedKey.status;
  }
}
