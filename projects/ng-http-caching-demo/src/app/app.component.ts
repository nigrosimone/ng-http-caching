import { Component } from '@angular/core';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingConfig,
} from '../../../ng-http-caching/src/lib/ng-http-caching.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  public url = 'https://my-json-server.typicode.com/typicode/demo/db';
  public tag = '';
  public regex: string = null;
  public cachedKeys: any = [];
  public timeSpan: number = null;
  public nocache = false;
  public filetime = null;

  private config: NgHttpCachingConfig;

  constructor(
    private ngHttpCachingService: NgHttpCachingService,
    private http: HttpClient
  ) {
    this.config = this.ngHttpCachingService.getConfig();
    this.filetime = null;
  }

  getRequest(): void {
    this.timeSpan = null;
    const timeStart = new Date();

    let headers = new HttpHeaders();
    if (this.tag) {
      headers = headers.set(NgHttpCachingHeaders.TAG, this.tag);
    }
    if (this.nocache) {
      headers = headers.set(NgHttpCachingHeaders.DISALLOW_CACHE, '1');
    }
    if (this.filetime && Number(this.filetime) !== this.config.lifetime) {
      headers = headers.set(NgHttpCachingHeaders.LIFETIME, this.filetime);
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
    const keys = [];
    this.ngHttpCachingService.store.forEach((value, key) => {
      const headers = [];
      Object.values(NgHttpCachingHeaders).forEach((ngHttpCachingHeaders) => {
        if (value.request.headers.has(ngHttpCachingHeaders)) {
          headers.push({
            [ngHttpCachingHeaders]: value.request.headers.get(
              ngHttpCachingHeaders
            ),
          });
        }
      });
      keys.push({ key, headers });
    });
    this.cachedKeys = keys;
  }
}
