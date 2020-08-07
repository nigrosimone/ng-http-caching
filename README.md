# NgHttpCaching [![Build Status](https://travis-ci.org/nigrosimone/ng-http-caching.svg?branch=master)](https://travis-ci.com/github/nigrosimone/ng-http-caching) [![Coverage Status](https://coveralls.io/repos/github/nigrosimone/ng-http-caching/badge.svg?branch=master)](https://coveralls.io/github/nigrosimone/ng-http-caching?branch=master)

Cache for HTTP requests in Angular application.

# Description

Sometime there is a need to cache the HTTP requests so that browser doesn’t have to hit server to fetch same data when same service is invoked serially or in parallel. `NgHttpCaching` intercept all request are made, try to retrieve a cached instance of the response and then return the cached response or send the request to the backend. Once the operation has completed cache the response.

See the [stackblitz demo](https://stackblitz.com/edit/demo-ng-http-caching?file=src%2Fapp%2Fapp.component.ts).

## Features

✅ HTTP caching<br>
✅ Handles simultaneous/parallel requests<br>
✅ Automatic garbage collector of cache<br>
✅ More than 90% unit tested<br>

# Get Started

*Step 1*: intall `ng-http-caching`

```bash
npm i ng-http-caching
```

*Step 2*: Import `NgHttpCachingModule` into your app module, eg.:

```ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { NgHttpCachingModule } from 'ng-http-caching';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgHttpCachingModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  ],
})
export class AppModule { }
```

if you want configure `NgHttpCachingModule`, you can pass a configuration to the module, eg.:

```ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { NgHttpCachingModule, NgHttpCachingConfig } from 'ng-http-caching';

// your config...
const ngHttpCachingConfig: NgHttpCachingConfig = {
  lifetime: 1000;
};

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgHttpCachingModule.forRoot(ngHttpCachingConfig),
  ],
  providers: [],
  bootstrap: [AppComponent],
  ],
})
export class AppModule { }
```

### Config

This is all the configuration interface, see below for the detail of each config.

```ts
// all configuration are optionally
export interface NgHttpCachingConfig {
  lifetime?: number;
  allowedMethod?: string[];
  cacheStrategy?: NgHttpCachingStrategy;
  isExpired?: (entry: NgHttpCachingEntry) => boolean | undefined;
  isCacheable?: (req: HttpRequest<any>) => boolean | undefined;
  getKey?: (req: HttpRequest<any>) => string | undefined;
}
```

### lifetime (number - default: 3.600.000)
Number of millisecond that a response is stored in the cache. 
You can set specific "lifetime" for each request by add the header `X-NG-HTTP-CACHING-LIFETIME` (see examble below).

### allowedMethod (string[] - default: ['GET'])
Array of allowed HTTP methods to cache. 
You can allow multiple methods, eg.: `['GET', 'POST', 'PUT', 'DELETE', 'HEAD']` or 
allow all methods by: `['ALL']`. If `allowedMethod` is an empty array (`[]`), no response are cached.
*Warning!* `NgHttpCaching` use the full url (url with query parameters) as unique key for the cached response,
this is correct for the `GET` request but is _potentially_ wrong for other type of request (eg. `POST`, `PUT`). 
You can set a different "key" by customizing the `getKey` config method (see `getKey` section).

### cacheStrategy (enum NgHttpCachingStrategy - default: NgHttpCachingStrategy.ALLOW_ALL)
Set the cache strategy, possible strategies are:
- `NgHttpCachingStrategy.ALLOW_ALL`: All request are cacheable if HTTP method is into `allowedMethod`;
- `NgHttpCachingStrategy.DISALLOW_ALL`: Only the request with `X-NG-HTTP-CACHING-ALLOW-CACHE` header are cacheable if HTTP method is into `allowedMethod`;

### isExpired (function - default see NgHttpCachingService.isExpired());
If this function return `true` the request is expired and a new request is send to backend. 
If the result is `undefined`, the normal behaviour is provided.
Example of customization:

```ts
import { NgHttpCachingConfig, NgHttpCachingEntry } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  isExpired: (entry: NgHttpCachingEntry): boolean | undefined => {
      // In this example a special API endpoint (/my-endpoint) send into the body response
      // an expireAt Date property. Only for this endpoit the expiration is provided by expireAt value.
      // For all the other endpoint normal behaviour is provided.
      if( entry.request.urlWithParams.indexOf('/my-endpoint') !== -1 ){
        return entry.response.body.expireAt > Date.now();
      }
      // by returning "undefined" normal "ng-http-caching" workflow is applied
      return undefined;
    },
};
```

### isCacheable (function - default see NgHttpCachingService.isCacheable());
If this function return `true` the request is cacheable. 
If the result is `undefined`, the normal behaviour is provided.
Example of customization:

```ts
import { NgHttpCachingConfig } from 'ng-http-caching';

const ngHttpCachingConfig: NgHttpCachingConfig = {
  isCacheable: (req: HttpRequest<any>): boolean | undefined => {
      // In this example the /my-endpoint isn't cacheable.
      // For all the other endpoint normal behaviour is provided.
      if( req.urlWithParams.indexOf('/my-endpoint') !== -1 ){
        return false;
      }
      // by returning "undefined" normal "ng-http-caching" workflow is applied
      return undefined;
    },
};
```


### getKey (function - default see NgHttpCachingService.getKey());
This function return the unique key (`string`) for store the response into the cache. 
If the result is `undefined`, the normal behaviour is provided.
Example of customization:

```ts
import { NgHttpCachingConfig } from 'ng-http-caching';
import * as hash from 'object-hash';  // install object-hash with: npm i object-hash

const hashOptions = {
  algorithm: 'md5',
  encoding: 'hex'
};

const ngHttpCachingConfig: NgHttpCachingConfig = {
  allowedMethod: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
  getKey: (req: HttpRequest<any>): string | undefined => {
    // In this example the full request is hashed for provide an unique key for the cache.
    // This is important if you want support method like POST or PUT.
    return req.method + '@' + req.urlWithParams + '@' + hash(req.params, hashOptions) + '@' + hash(req.body, hashOptions);
  },
};
```

## Example: exclude specific request from cache

You can disallow specific request by add the header `X-NG-HTTP-CACHING-DISALLOW-CACHE`, eg.:

```ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // This request will never cache.
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
         [NgHttpCachingHeaders.DISALLOW_CACHE]: '1',
      }
    }).subscribe(e => console.log);
  }
}
```

## Example: set specific lifetime for request

You can set specific lifetime for request by add the header `X-NG-HTTP-CACHING-LIFETIME` with a string value as the number of millisecond, eg.:

```ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // This request will expire from 365 days.
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
         [NgHttpCachingHeaders.LIFETIME]: (1000 * 60 * 60 * 24 * 365).toString(),
      }
    }).subscribe(e => console.log);
  }
}
```

## Example: mark specific request as cacheable (if cache strategy is DISALLOW_ALL)

If you have choose the `DISALLOW_ALL` cache strategy, you can mark specific request as cacheable by adding the header `X-NG-HTTP-CACHING-ALLOW-CACHE`, eg.:

```ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { NgHttpCachingHeaders } from 'ng-http-caching';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // This request is marked as cacheable (this is necessary only if cache strategy is DISALLOW_ALL)
    // Note: all the "special" headers in NgHttpCachingHeaders are removed before send the request to the backend.
    this.http.get('https://my-json-server.typicode.com/typicode/demo/db', {
      headers: {
         [NgHttpCachingHeaders.ALLOW_ALL]: '1',
      }
    }).subscribe(e => console.log);
  }
}
```