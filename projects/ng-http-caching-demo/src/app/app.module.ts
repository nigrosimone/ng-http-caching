import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgxHttpCachingModule } from '../../../ng-http-caching/src/lib/ng-http-caching.module';
import { NgxHttpCachingService } from '../../../ng-http-caching/src/lib/ng-http-caching.service';



@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    NgxHttpCachingModule.forRoot({
      lifetime: 3600 * 60
    }),
  ],
  providers: [
    NgxHttpCachingService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
