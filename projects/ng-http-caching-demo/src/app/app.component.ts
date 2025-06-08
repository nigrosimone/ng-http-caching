import { Component, OnInit, inject, model, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingConfig,
  NgHttpCachingHeadersList,
  withNgHttpCachingContext
} from '../../../ng-http-caching/src/public-api';

interface CachedKey {
  key: string;
  headers: Array<Record<string, string>>;
  status: 'cached' | 'queue';
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule, FormsModule]
})
export class AppComponent implements OnInit {
  private readonly ngHttpCachingService = inject(NgHttpCachingService);
  private readonly http = inject(HttpClient);

  public readonly url = model('https://my-json-server.typicode.com/typicode/demo/db');
  public readonly key = model('GET@' + this.url());
  public readonly tag = model('');
  public readonly regex = model('');
  public readonly cachedKeys = signal<CachedKey[]>([], {
    equal: (a, b) => {
      if (!a || !b) return false;
      if (a === b) return true;
      if (a.length !== b.length) return false;
      for (let i = 0, l = a.length; i < l; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    }
  });
  public readonly timeSpan = signal<number | null>(null);
  public readonly nocache = signal(false);
  public readonly lifetime = model<number | null>(null);
  public readonly count = signal(0);
  public readonly typeOfRequests = signal(['PARALLEL', 'SEQUENTIAL', 'NESTED']);
  public readonly typeOfRequest = model(this.typeOfRequests()[0]);

  private readonly config: NgHttpCachingConfig;
  private timer!: ReturnType<typeof setTimeout>;

  constructor() {
    this.config = this.ngHttpCachingService.getConfig();
  }

  ngOnInit(): void {
    this.updateCachedKeys();
  }

  async getRequest(): Promise<void> {
    this.timeSpan.set(null);
    this.count.set(0);
    const timeStart = new Date();

    /**
    * @see https://github.com/nigrosimone/ng-http-caching?tab=readme-ov-file#headers
    */
    let headers = new HttpHeaders();
    if (this.tag()) {
      headers = headers.set(NgHttpCachingHeaders.TAG, this.tag());
    }
    if (this.nocache()) {
      headers = headers.set(NgHttpCachingHeaders.DISALLOW_CACHE, '1');
    }
    const lifetime = this.lifetime();
    if (lifetime && Number(lifetime) !== this.config.lifetime) {
      headers = headers.set(NgHttpCachingHeaders.LIFETIME, lifetime.toString());
    }

    /**
    * You can override NgHttpCachingConfig
    * @see https://github.com/nigrosimone/ng-http-caching?tab=readme-ov-file#httpcontext
    */
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

    switch (this.typeOfRequest()) {
      case 'SEQUENTIAL': {
        // test sequential requests
        const result1 = await lastValueFrom(
          this.http.get(this.url(), { headers, context })
        );
        console.log('Sequential response 1', result1);
        this.count.update(value => value + 1);
        const result2 = await lastValueFrom(
          this.http.get(this.url(), { headers, context })
        );
        console.log('Sequential response 2', result2);
        this.count.update(value => value + 1);
        this.timeSpan.set(new Date().getTime() - timeStart.getTime());
        this.updateCachedKeys();
        break;
      }
      case 'PARALLEL': {
        // test parallel requests
        const results = await Promise.all([
          lastValueFrom(this.http.get(this.url(), { headers, context })),
          lastValueFrom(this.http.get(this.url(), { headers, context })),
        ]);
        this.count.update(value => value + 1);
        this.count.update(value => value + 1);
        this.timeSpan.set(new Date().getTime() - timeStart.getTime());
        this.updateCachedKeys();
        console.log('Parallel responses', results);
        break;
      }
      case 'NESTED': {
        // test nested requests
        this.http.get(this.url(), { headers, context }).subscribe((result1) => {
          console.log('Nested response 1', result1);
          this.count.update(value => value + 1);
          this.http.get(this.url(), { headers, context }).subscribe((result2) => {
            console.log('Nested response 2', result2);
            this.count.update(value => value + 1);
            this.timeSpan.set(new Date().getTime() - timeStart.getTime());
            this.updateCachedKeys();
          });
        });
        break;
      }
    }
  }

  clearCache(): void {
    /** @see https://github.com/nigrosimone/ng-http-caching?tab=readme-ov-file#cache-service */
    this.ngHttpCachingService.clearCache();
    this.updateCachedKeys();
  }

  clearCacheByTag(): void {
    /** @see https://github.com/nigrosimone/ng-http-caching?tab=readme-ov-file#cache-service */
    this.ngHttpCachingService.clearCacheByTag(this.tag());
    this.updateCachedKeys();
  }

  clearCacheByRegex(): void {
    /** @see https://github.com/nigrosimone/ng-http-caching?tab=readme-ov-file#cache-service */
    this.ngHttpCachingService.clearCacheByRegex(new RegExp(this.regex()));
    this.updateCachedKeys();
  }

  clearCacheByKey(): void {
    /** @see https://github.com/nigrosimone/ng-http-caching?tab=readme-ov-file#cache-service */
    this.ngHttpCachingService.clearCacheByKey(this.key());
    this.updateCachedKeys();
  }

  updateCachedKeys(): void {
    clearTimeout(this.timer);

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
    this.cachedKeys.set(keys);

    this.timer = setTimeout(() => this.updateCachedKeys(), 100);
  }

  trackByCachedKey(cachedKey: CachedKey): string {
    return cachedKey.key + '@' + cachedKey.status;
  }
}

/**
 * NgHttpCaching demo
 * Cache for HTTP requests in Angular application.
 * see https://www.npmjs.com/package/ng-http-caching
 */