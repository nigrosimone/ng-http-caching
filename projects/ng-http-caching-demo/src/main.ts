import { provideZonelessChangeDetection } from "@angular/core"
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideNgHttpCaching, withNgHttpCachingNgSimpleState } from 'projects/ng-http-caching/src/public-api';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideNgHttpCaching({
      store: withNgHttpCachingNgSimpleState({
        enableDevTool: true
      }),
    }),
    provideHttpClient(withInterceptorsFromDi()),
    provideZonelessChangeDetection(),
  ]
});