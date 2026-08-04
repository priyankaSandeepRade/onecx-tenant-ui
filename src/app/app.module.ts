import { Injector, NgModule, isDevMode } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { TranslateLoader, TranslateModule, MissingTranslationHandler } from '@ngx-translate/core'

import { LetDirective } from '@ngrx/component'
import { EffectsModule } from '@ngrx/effects'
import { StoreRouterConnectingModule } from '@ngrx/router-store'
import { StoreModule } from '@ngrx/store'
import { StoreDevtoolsModule } from '@ngrx/store-devtools'

import { AngularAuthModule } from '@onecx/angular-auth'
import {
  createTranslateLoader,
  providePermissionService,
  provideThemeConfig,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'
import { APP_CONFIG } from '@onecx/angular-integration-interface'
import {
  AngularAcceleratorMissingTranslationHandler,
  AngularAcceleratorModule,
  providePortalDialogService
} from '@onecx/angular-accelerator'
import { StandaloneShellModule, provideStandaloneProviders } from '@onecx/angular-standalone-shell'

import { Configuration } from './shared/generated'
import { apiConfigProvider } from './shared/utils/apiConfigProvider.utils'

import { environment } from 'src/environments/environment'
import { AppComponent } from './app.component'
import { AppRoutingModule } from './app-routing.module'
import { metaReducers, reducers } from './app.reducers'

@NgModule({
  imports: [
    AppComponent,
    AngularAcceleratorModule,
    AngularAuthModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    EffectsModule.forRoot([]),
    LetDirective,
    StandaloneShellModule,
    StoreRouterConnectingModule.forRoot(),
    StoreModule.forRoot(reducers, { metaReducers }),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: !isDevMode(),
      autoPause: true,
      trace: false,
      traceLimit: 75
    }),
    TranslateModule.forRoot({
      isolate: true,
      loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: AngularAcceleratorMissingTranslationHandler
      }
    })
  ],
  providers: [
    { provide: APP_CONFIG, useValue: environment },
    {
      provide: Configuration,
      useFactory: apiConfigProvider,
      deps: [Injector]
    },
    providePortalDialogService(),
    providePermissionService(),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideHttpClient(withInterceptorsFromDi()),
    provideStandaloneProviders(),
    provideThemeConfig(),
    provideAnimations()
  ]
})
export class AppModule {}
