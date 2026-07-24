import {
  Component,
  inject,
  model,
  signal
} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgHttpCachingService,
  NgHttpCachingHeaders,
  NgHttpCachingConfig,
  NgHttpCachingHeadersList,
  withNgHttpCachingContext
} from 'ng-http-caching';

interface CachedKey {
  key: string;
  headers: Array<Record<string, string>>;
  status: 'cached' | 'queue';
}

@Component({
  selector: 'app-root',
  template: `
  <main>
  <ul class="form-style-1">
    <li>
      <label>URL <span class="required">*</span></label>
      <input type="url" required [(ngModel)]="url" style="width: 400px;" />
    </li>
    <li>
      <label>Add TAG to request</label>
      <input type="text" [(ngModel)]="tag" />
    </li>
    <li>
      <label>Add LIFETIME to request</label>
      <input type="number" [(ngModel)]="lifetime" />
    </li>
    <li>
      <label>Mark request as "NO CACHEABLE"</label>
      <input
        type="checkbox"
        [(ngModel)]="nocache"
        [ngModelOptions]="{ standalone: true }"
      />
    </li>
    <li>
      <select [(ngModel)]="typeOfRequest">
        @for(t of typeOfRequests(); track t){
        <option [ngValue]="t">{{ t }}</option>
        }
      </select>
      <button (click)="getRequest()" [disabled]="!url() ? 'disabled' : null">
        EXECUTE REQUEST
      </button>
      <br />
      <em>
        HTTP server respond in {{ timeSpan() }} ms (for {{ count() }} requests)
      </em>
    </li>
    <li>
      <hr />
    </li>
    <li>
      <label>Clear cache for TAG</label>
      <input type="text" [(ngModel)]="tag" />
      <button (click)="clearCacheByTag()">Clear Cache</button>
    </li>
    <li>
      <label>Clear cache for REGEX</label>
      <input type="text" [(ngModel)]="regex" />
      <button (click)="clearCacheByRegex()">Clear Cache</button>
    </li>
    <li>
      <label>Clear cache for KEY</label>
      <input type="text" [(ngModel)]="key" />
      <button (click)="clearCacheByKey()">Clear Cache</button>
    </li>
    <li>
      <label>Clear all cache</label>
      <button (click)="clearCache()">Clear Cache</button>
    </li>
    <li>
      <hr />
    </li>
  </ul>

  <table>
    <thead>
      <th>Key</th>
      <th>Headers</th>
      <th>Status</th>
    </thead>
    <tbody>
      @for(cachedKey of cachedKeys(); track trackByCachedKey(cachedKey)){
      <tr [class.queue]="cachedKey.status === 'queue'">
        <td style="width: 30%; text-align: left;">
          {{ cachedKey.key }}
        </td>
        <td style="width: 60%; text-align: left;">
          {{ cachedKey.headers | json }}
        </td>
        <td style="width: 10%; text-align: left;">
          {{ cachedKey.status }}
        </td>
      </tr>
      } @empty {
      <tr>
        <td style="text-align: center;" colspan="3">No cached keys</td>
      </tr>
      }
    </tbody>
  </table>
</main>`,
  imports: [JsonPipe, FormsModule]
})
export class AppComponent {
  private readonly ngHttpCachingService = inject(NgHttpCachingService);
  private readonly http = inject(HttpClient);

  public readonly url = model(
    'https://my-json-server.typicode.com/typicode/demo/db'
  );
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
    },
  });
  public readonly timeSpan = signal<number>(0);
  public readonly nocache = signal(false);
  public readonly lifetime = model<number | null>(null);
  public readonly count = signal(0);
  public readonly typeOfRequests = signal(['PARALLEL', 'SEQUENTIAL', 'NESTED']);
  public readonly typeOfRequest = model(this.typeOfRequests()[0]);

  private readonly config: NgHttpCachingConfig =
    this.ngHttpCachingService.getConfig();
  private timer!: ReturnType<typeof setTimeout>;

  constructor() {
    this.updateCachedKeys();
  }

  async getRequest(): Promise<void> {
    this.timeSpan.set(0);
    this.count.set(0);

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
      },
    });

    const timeStart = Date.now();

    switch (this.typeOfRequest()) {
      case 'SEQUENTIAL': {
        // test sequential requests
        const result1 = await lastValueFrom(
          this.http.get(this.url(), { headers, context })
        );
        console.log('Sequential response 1', result1);
        this.count.update((value) => value + 1);
        const result2 = await lastValueFrom(
          this.http.get(this.url(), { headers, context })
        );
        console.log('Sequential response 2', result2);
        this.count.update((value) => value + 1);
        this.timeSpan.set(Date.now() - timeStart);
        this.updateCachedKeys();
        break;
      }
      case 'PARALLEL': {
        // test parallel requests
        const results = await Promise.all([
          lastValueFrom(this.http.get(this.url(), { headers, context })),
          lastValueFrom(this.http.get(this.url(), { headers, context })),
        ]);
        this.count.update((value) => value + 1);
        this.count.update((value) => value + 1);
        this.timeSpan.set(Date.now() - timeStart);
        this.updateCachedKeys();
        console.log('Parallel responses', results);
        break;
      }
      case 'NESTED': {
        // test nested requests
        this.http.get(this.url(), { headers, context }).subscribe((result1) => {
          console.log('Nested response 1', result1);
          this.count.update((value) => value + 1);
          this.http
            .get(this.url(), { headers, context })
            .subscribe((result2) => {
              console.log('Nested response 2', result2);
              this.count.update((value) => value + 1);
              this.timeSpan.set(Date.now() - timeStart);
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
              [ngHttpCachingHeaders]: value.request.headers.get(
                ngHttpCachingHeaders
              ) as string,
            });
          }
        }
      );
      keys.push({ key, headers, status: 'cached' });
    });
    let hasQueue = false;
    this.ngHttpCachingService.getQueue().forEach((_, key) => {
      hasQueue = true;
      keys.push({ key, headers: [], status: 'queue' });
    });
    this.cachedKeys.set(keys);

    if (hasQueue) {
      this.timer = setTimeout(() => this.updateCachedKeys(), 100);
    }
  }

  trackByCachedKey(cachedKey: CachedKey): string {
    return cachedKey.key + '@' + cachedKey.status;
  }
}

