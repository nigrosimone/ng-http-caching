import { makeEnvironmentProviders, Provider } from "@angular/core";
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgHttpCachingInterceptorService } from "./ng-http-caching-interceptor.service";
import { NG_HTTP_CACHING_CONFIG, NgHttpCachingConfig, NgHttpCachingService } from "./ng-http-caching.service";
import {
    NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG,
    NgHttpCachingNgSimpleStateSentinel,
} from "./storage/ng-http-caching-ng-simple-state-adapter";

export function provideNgHttpCaching(ngHttpCachingConfig?: NgHttpCachingConfig) {
    const providers: Provider[] = [
        NgHttpCachingService,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: NgHttpCachingInterceptorService,
            multi: true,
        },
        NgHttpCachingInterceptorService,
    ];
    if (ngHttpCachingConfig) {
        providers.push({
            provide: NG_HTTP_CACHING_CONFIG,
            useValue: ngHttpCachingConfig,
        });
        // If the user chose the ng-simple-state adapter, forward
        // the optional adapter config so it's available via DI.
        if (ngHttpCachingConfig.store instanceof NgHttpCachingNgSimpleStateSentinel
            && ngHttpCachingConfig.store.adapterConfig) {
            providers.push({
                provide: NG_HTTP_CACHING_NG_SIMPLE_STATE_CONFIG,
                useValue: ngHttpCachingConfig.store.adapterConfig,
            });
        }
    }
    return makeEnvironmentProviders(providers);
}
