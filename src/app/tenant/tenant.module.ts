import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { EffectsModule } from '@ngrx/effects'
import { StoreModule } from '@ngrx/store'

import { providePortalDialogService } from '@onecx/angular-accelerator'

import { tenantFeature } from './tenant.reducers'
import { routes } from './tenant.routes'

import { TenantSearchEffects } from './tenant-search/tenant-search.effects'

@NgModule({
  imports: [
    EffectsModule.forFeature([TenantSearchEffects]),
    RouterModule.forChild(routes),
    StoreModule.forFeature(tenantFeature)
  ],
  providers: [providePortalDialogService()]
})
export class TenantModule {}
