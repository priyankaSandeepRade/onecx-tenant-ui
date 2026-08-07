import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'

import { CheckboxModule } from 'primeng/checkbox'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { TooltipModule } from 'primeng/tooltip'

import { Tenant } from 'src/app/shared/generated'

@Component({
  selector: 'app-tenant-intern',
  standalone: true,
  imports: [
    CheckboxModule,
    FloatLabelModule,
    FormsModule,
    InputTextModule,
    ReactiveFormsModule,
    TooltipModule,
    TranslateModule
  ],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tenant-intern.component.html'
})
export class TenantInternComponent {
  private readonly datePipe = inject(DatePipe)
  // signals
  public readonly tenant = input.required<Tenant | undefined>()
  public readonly dateFormat = input.required<string>()
  // calculated signals
  public readonly creationDate = computed(() => {
    const date = this.tenant()?.creationDate
    if (!date) return '' // fallback
    return this.datePipe.transform(date, this.dateFormat() ?? 'medium') || ''
  })
  public readonly modificationDate = computed(() => {
    const date = this.tenant()?.modificationDate
    if (!date) return '' // fallback
    return this.datePipe.transform(date, this.dateFormat() ?? 'medium') || ''
  })
}
