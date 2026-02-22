import { provideZonelessChangeDetection } from "@angular/core"
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideNgHttpCaching, withNgHttpCachingNgSimpleState } from 'ng-http-caching';
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