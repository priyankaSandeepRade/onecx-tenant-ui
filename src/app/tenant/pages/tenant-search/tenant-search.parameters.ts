import { z, ZodTypeAny } from 'zod'

import { TenantSearchCriteria as TenantSearchRequest } from 'src/app/shared/generated'

export const tenantSearchCriteriasSchema = z.object({
  orgId: z.string().optional(),
  pageNumber: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional(),
  pageSize: z
    .string()
    .transform((v) => (v ? Number(v) : undefined))
    .optional()
} satisfies Partial<Record<keyof TenantSearchRequest, ZodTypeAny>>)

export type TenantSearchCriteria = z.infer<typeof tenantSearchCriteriasSchema>
