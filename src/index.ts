import * as Artifacts from './artifacts'
import { AdminPools, ERC20CollateralPool, Pools } from './pools'
import * as AssistedProvider from './provider/assisted.provider'
import * as SelfProvider from './provider/self.provider'
import { Erc20 } from './utilities/erc20'
import * as generics from './utilities/generics'
import * as util from './utilities/util'

export * as TypesErc20CollateralPool from './types/erc20-collateral-token'
export * as TypesPool from './types/pools'
export * as TypesStaking from './types/staking'
export * as Types from './types/types'
export * from './base-classes/base-contract'
export * from './base-classes/base-provider'

const Utilities = {
  util,
  generics,
  Erc20
}

export {
  Artifacts,
  AssistedProvider,
  SelfProvider,
  Utilities,
  ERC20CollateralPool,
  Erc20,
  Pools,
  AdminPools
}

export const DefactorSDK = {
  Artifacts,
  AssistedProvider,
  SelfProvider,
  Utilities,
  ERC20CollateralPool,
  Erc20,
  AdminPools,
  Pools
}
