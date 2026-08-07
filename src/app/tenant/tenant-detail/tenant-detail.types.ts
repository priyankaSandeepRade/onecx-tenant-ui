import { Tenant } from 'src/app/shared/generated'

export interface TenantDetailViewModel {
  itemToEdit: Tenant | undefined
}

export type TenantDetailDialogResult = Tenant & {
  image: File | null
  imageRemoved: boolean
}

export enum TenantDialogMode {
  DETAILS,
  CREATE,
  UPDATE
}
