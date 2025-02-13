import * as Artifacts from './artifacts'
import { Buyback } from './buyback'
import {
  AdminPools,
  ERC20CollateralPool,
  ERC20CollateralPoolToplend,
  Pools
} from './pools'
import * as AssistedProvider from './provider/assisted.provider'
import * as SelfProvider from './provider/self.provider'
import { StakingExpiration, StakingV1 } from './staking'
import { Erc20 } from './utilities/erc20'
import * as generics from './utilities/generics'
import * as util from './utilities/util'
import { Vesting } from './vesting'

export * as TypesBuyback from './types/buyback'
export * as TypesErc20CollateralPool from './types/erc20-collateral-token'
export * as TypesErc20CollateralPoolToplend from './types/erc20-collateral-pool-toplend'
export * as TypesPool from './types/pools'
export * as TypesStakingV1 from './types/staking/v1'
export * as TypesStakingV2 from './types/staking/v2'
export * as TypesVesting from './types/vesting'
export * as Types from './types/types'
export * from './base-classes/core-contract'
export * from './base-classes/base-contract'
export * from './base-classes/base-provider'

const Utilities = { util, generics, Erc20 }

export {
  Artifacts,
  AssistedProvider,
  Buyback,
  SelfProvider,
  Utilities,
  ERC20CollateralPool,
  StakingV1,
  StakingExpiration,
  Erc20,
  Pools,
  AdminPools,
  ERC20CollateralPoolToplend,
  Vesting
}

export const DefactorSDK = {
  Artifacts,
  AssistedProvider,
  Buyback,
  SelfProvider,
  Utilities,
  ERC20CollateralPool,
  Erc20,
  AdminPools,
  Pools,
  Vesting
}
