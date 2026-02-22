import { NgModule, ModuleWithProviders, Provider } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  NG_HTTP_CACHING_CONFIG,
  NgHttpCachingConfig,
  NgHttpCachingService,
} from './ng-http-caching.service';
import { NgHttpCachingInterceptorService } from './ng-http-caching-interceptor.service';
import {
  NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG,
  NgHttpCachingNgSimpleStateSentinel,
} from './storage/ng-http-caching-ng-simple-state-sentinel';

/** @deprecated use provideNgHttpCaching */
@NgModule({
  providers: [
    NgHttpCachingService,
    NgHttpCachingInterceptorService,
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
    const providers: Provider[] = [
      {
        provide: NG_HTTP_CACHING_CONFIG,
        useValue: ngHttpCachingConfig,
      },
    ];
    // Forward optional ng-simple-state adapter config
    if (ngHttpCachingConfig?.store instanceof NgHttpCachingNgSimpleStateSentinel
      && ngHttpCachingConfig.store.adapterConfig) {
      providers.push({
        provide: NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG,
        useValue: ngHttpCachingConfig.store.adapterConfig,
      });
    }
    return {
      ngModule: NgHttpCachingModule,
      providers,
    };
  }
}
