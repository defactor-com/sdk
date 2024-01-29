import * as Artifacts from './artifacts'
import * as AssistedProvider from './assisted-provider'
import * as Erc20CollateralPool from './erc20-collateral-pool'
import * as Pools from './pools'
import * as SelfProvider from './self-provider'
import * as ProviderUtilities from './util'

export * as TypesErc20CollateralToken from './types/erc20-collateral-token'
export * as TypesPools from './types/pools'
export * as TypesGeneral from './types/types'

export {
  Artifacts,
  AssistedProvider,
  SelfProvider,
  ProviderUtilities,
  Erc20CollateralPool,
  Pools
}

export const DefactorSDK = {
  Artifacts,
  AssistedProvider,
  SelfProvider,
  ProviderUtilities,
  Erc20CollateralPool,
  Pools
}
