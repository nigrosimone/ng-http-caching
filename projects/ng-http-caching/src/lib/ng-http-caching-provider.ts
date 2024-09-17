import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgHttpCachingInterceptorService } from "./ng-http-caching-interceptor.service";
import { NG_HTTP_CACHING_CONFIG, NgHttpCachingConfig, NgHttpCachingService } from "./ng-http-caching.service";

export function provideNgHttpCaching(ngHttpCachingConfig?: NgHttpCachingConfig) {
    const providers: EnvironmentProviders[] = [];
    if (ngHttpCachingConfig) {
        providers.push(makeEnvironmentProviders([{
            provide: NG_HTTP_CACHING_CONFIG,
            useValue: ngHttpCachingConfig,
        }]));
    }
    providers.push(makeEnvironmentProviders([
        NgHttpCachingService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NgHttpCachingInterceptorService,
            multi: true,
        },
        NgHttpCachingInterceptorService
    ]));
    return providers;
}
