import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgHttpCachingModule } from '../../../ng-http-caching/src/lib/ng-http-caching.module';
import { NgHttpCachingService } from '../../../ng-http-caching/src/lib/ng-http-caching.service';



@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgHttpCachingModule.forRoot({
      lifetime: 3600 * 60
    }),
  ],
  providers: [
    NgHttpCachingService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
