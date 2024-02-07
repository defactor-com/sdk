import * as Artifacts from './artifacts'
import * as AssistedProvider from './assisted-provider'
import { Erc20 } from './erc20'
import { ERC20CollateralPool } from './erc20-collateral-pool'
import { Pools } from './pools'
import * as SelfProvider from './self-provider'
import * as TypesErc20CollateralToken from './types/erc20-collateral-token'
import * as TypesPools from './types/pools'
import * as TypesGeneral from './types/types'
import * as Utilities from './util'

const types = {
  Erc20CollateralToken: TypesErc20CollateralToken,
  Pools: TypesPools,
  General: TypesGeneral
}

export {
  Artifacts,
  AssistedProvider,
  SelfProvider,
  Utilities,
  ERC20CollateralPool,
  Erc20,
  Pools,
  types
}

export const DefactorSDK = {
  Artifacts,
  AssistedProvider,
  SelfProvider,
  Utilities,
  ERC20CollateralPool,
  Erc20,
  Pools
}
