import { DatePipe } from '@angular/common'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'

import { TenantInternComponent } from './tenant-intern.component'

describe('TenantInternComponent', () => {
  let component: TenantInternComponent
  let fixture: ComponentFixture<TenantInternComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TenantInternComponent,
        TranslateTestingModule.withTranslations({
          de: require('./src/assets/i18n/de.json'),
          en: require('./src/assets/i18n/en.json')
        }).withDefaultLanguage('de')
      ],
      providers: []
    }).compileComponents()

    fixture = TestBed.createComponent(TenantInternComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('dateFormat', 'medium')
    fixture.componentRef.setInput('tenant', undefined)
    fixture.detectChanges()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('creationDate', () => {
    it('should return empty string if tenant has no creationDate', () => {
      fixture.componentRef.setInput('tenant', {})
      fixture.detectChanges()
      expect(component.creationDate()).toBe('')
    })

    it('should return formatted date if tenant has a creationDate', () => {
      fixture.componentRef.setInput('tenant', { creationDate: '2024-01-15T10:00:00.000Z' })
      fixture.detectChanges()
      expect(component.creationDate()).toBeTruthy()
    })

    it('should return empty string if datePipe returns null for creationDate', () => {
      jest.spyOn(DatePipe.prototype, 'transform').mockReturnValue(null)
      fixture.componentRef.setInput('tenant', { creationDate: '2024-01-15T10:00:00.000Z' })
      fixture.detectChanges()
      expect(component.creationDate()).toBe('')
    })
  })

  describe('modificationDate', () => {
    it('should return empty string if tenant has no modificationDate', () => {
      fixture.componentRef.setInput('tenant', {})
      fixture.detectChanges()
      expect(component.modificationDate()).toBe('')
    })

    it('should return formatted date if tenant has a modificationDate', () => {
      fixture.componentRef.setInput('tenant', { modificationDate: '2024-01-15T10:00:00.000Z' })
      fixture.detectChanges()
      expect(component.modificationDate()).toBeTruthy()
    })

    it('should return empty string if datePipe returns null for modificationDate', () => {
      jest.spyOn(DatePipe.prototype, 'transform').mockReturnValue(null)
      fixture.componentRef.setInput('tenant', { modificationDate: '2024-01-15T10:00:00.000Z' })
      fixture.detectChanges()
      expect(component.modificationDate()).toBe('')
    })

    it('should use default format', () => {
      fixture.componentRef.setInput('tenant', {
        modificationDate: '2024-01-15T00:00:00.000Z',
        creationDate: '2024-01-15T00:00:00.000Z'
      })
      fixture.componentRef.setInput('dateFormat', undefined)
      fixture.detectChanges()
      expect(component.modificationDate()).toBeTruthy()
      expect(component.creationDate()).toBeTruthy()
    })
  })
})
