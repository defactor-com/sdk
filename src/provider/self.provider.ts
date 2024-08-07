import { BaseProvider } from '../base-classes'
import { ERC20CollateralPool } from '../pools/erc20-collateral-pool'
import { Pools as PoolsClass } from '../pools/pools'
import { Staking } from '../staking/staking'
import {
  Abi,
  ERC20CollateralPoolConstructorParams,
  PoolsConstructorParams,
  PrivateKey,
  StakingConstructorParams
} from '../types/types'

export class SelfProvider<
  T extends PoolsClass | ERC20CollateralPool | Staking
> extends BaseProvider<T> {
  constructor(
    contractBuilder: new (
      ...args:
        | PoolsConstructorParams
        | ERC20CollateralPoolConstructorParams
        | StakingConstructorParams
    ) => T,
    address: string,
    apiUrl: string,
    privateKey: PrivateKey,
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, privateKey, abi))
  }
}
