import { Location } from '@angular/common'

import { RefType } from '../generated'

export function getImageUrl(basePath: string, objectId: string | number): string {
  return `${basePath}/images/${objectId}/${RefType.Logo}`
}

export function prepareUrlPath(url?: string, path?: string): string | undefined {
  if (url && path) return Location.joinWithSlash(url, path)
  else if (url) return url
  else return undefined
}
