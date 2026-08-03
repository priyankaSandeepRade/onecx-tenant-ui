import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { LetDirective } from '@ngrx/component'
import { EffectsModule } from '@ngrx/effects'
import { StoreModule } from '@ngrx/store'
import { DatePickerModule } from 'primeng/datepicker'

import { AngularAcceleratorModule, providePortalDialogService } from '@onecx/angular-accelerator'
import { PortalPageComponent } from '@onecx/angular-utils'

import { SharedModule } from 'src/app/shared/shared.module'
import { tenantFeature } from './tenant.reducers'
import { routes } from './tenant.routes'

import { TenantSearchComponent } from './pages/tenant-search/tenant-search.component'
import { TenantSearchEffects } from './pages/tenant-search/tenant-search.effects'
import { CardModule } from 'primeng/card'
import { TenantCreateUpdateComponent } from './pages/tenant-search/dialogs/tenant-create-update/tenant-create-update.component'
import { TooltipModule } from 'primeng/tooltip'
import { TabMenuModule } from 'primeng/tabmenu'
import { ButtonModule } from 'primeng/button'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'

@NgModule({
  providers: [providePortalDialogService()],
  imports: [
    DatePickerModule,
    CommonModule,
    EffectsModule.forFeature([TenantSearchEffects]),
    LetDirective,
    AngularAcceleratorModule,
    PortalPageComponent,
    RouterModule.forChild(routes),
    SharedModule,
    StoreModule.forFeature(tenantFeature),
    CardModule,
    TooltipModule,
    TabMenuModule,
    ButtonModule,
    InputGroupAddonModule,
    TenantCreateUpdateComponent,
    TenantSearchComponent
  ]
})
export class TenantModule {}
