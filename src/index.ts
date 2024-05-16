import * as Artifacts from './artifacts'
import { ERC20CollateralPool, Pools } from './pools'
import * as AssistedProvider from './pools/assisted-provider'
import * as SelfProvider from './pools/self-provider'
import * as TypesErc20CollateralToken from './types/erc20-collateral-token'
import * as TypesPools from './types/pools'
import * as TypesGeneral from './types/types'
import { Erc20 } from './utilities/erc20'
import * as generics from './utilities/generics'
import * as util from './utilities/util'

const Utilities = {
  util,
  generics,
  Erc20
}

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
