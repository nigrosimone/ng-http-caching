import { Component } from '@angular/core';
import { NgHttpCachingService, NgHttpCachingHeaders} from '../../../ng-http-caching/src/lib/ng-http-caching.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public url = 'https://my-json-server.typicode.com/typicode/demo/db';
  public tag: string = null;
  public regex: string = null;
  public cachedKeys: any = null;

  constructor(
    private ngHttpCachingService: NgHttpCachingService,
    private http: HttpClient){}

    updateCachedKeys(): void {
      const keys = [];
      this.ngHttpCachingService.store.forEach((value, key) => {
        keys.push({key, headers: value.request.headers});
      });
      this.cachedKeys = keys;
    }

  getRequest(): void {
    this.http.get(this.url, {
      withCredentials: true,
      headers: {
        [NgHttpCachingHeaders.TAG]: this.tag
      }
    }).subscribe(result => {
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
}
