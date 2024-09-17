import { enableProdMode, isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { NgHttpCachingLocalStorage, provideNgHttpCaching } from 'projects/ng-http-caching/src/public-api';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

if (!isDevMode()) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideNgHttpCaching({
      store: new NgHttpCachingLocalStorage()
    }),
    provideHttpClient(withInterceptorsFromDi())
  ]
});