import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingConfig,
  NgHttpCachingHeadersList
} from '../../../ng-http-caching/src/public-api';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  public tag = '';
  public regex = '';
  public cachedKeys: CachedKey[] = [];
  public timeSpan = 0;
  public nocache = false;
  public lifetime = null;

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


  getRequest(): void {
    this.timeSpan = 0;
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
    this.http.get(this.url, { headers }).subscribe((result) => {
      this.timeSpan = new Date().getTime() - timeStart.getTime();
      this.updateCachedKeys();
      console.log('response', result);
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
    this.ngHttpCachingService.clearCacheByKey(this.url);
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
