import { NgModule, ModuleWithProviders } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  NG_HTTP_CACHING_CONFIG,
  NgHttpCachingConfig,
  NgHttpCachingService,
} from './ng-http-caching.service';
import { NgHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';

@NgModule({
  providers: [
    NgHttpCachingService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: NgHttpCachingInterceptorService,
      multi: true,
    },
  ]
})
export class NgHttpCachingModule {
  static forRoot(
    ngHttpCachingConfig?: NgHttpCachingConfig
  ): ModuleWithProviders<NgHttpCachingModule> {
    return {
      ngModule: NgHttpCachingModule,
      providers: [
        {
          provide: NG_HTTP_CACHING_CONFIG,
          useValue: ngHttpCachingConfig,
        },
      ],
    };
  }
}
