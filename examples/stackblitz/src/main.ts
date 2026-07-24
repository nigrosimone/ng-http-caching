import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgHttpCaching, withNgHttpCachingLocalStorage } from 'ng-http-caching';
import { AppComponent } from './app/app.component';

void bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideNgHttpCaching({ lifetime: 10_000, store: withNgHttpCachingLocalStorage() }),
  ],
});
