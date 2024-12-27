import { BaseProvider } from '../base-classes'
import { Buyback } from '../buyback/buyback'
import { ERC20CollateralPool } from '../pools/erc20-collateral-pool'
import { Pools as PoolsClass } from '../pools/pools'
import { Staking } from '../staking/staking'
import {
  Abi,
  BuybackConstructorParams,
  ERC20CollateralPoolConstructorParams,
  PoolsConstructorParams,
  PrivateKey,
  StakingConstructorParams,
  VestingConstructorParams
} from '../types/types'
import { Vesting } from '../vesting'

export class SelfProvider<
  T extends PoolsClass | ERC20CollateralPool | Staking | Buyback | Vesting
> extends BaseProvider<T> {
  constructor(
    contractBuilder: new (
      ...args:
        | PoolsConstructorParams
        | ERC20CollateralPoolConstructorParams
        | StakingConstructorParams
        | BuybackConstructorParams
        | VestingConstructorParams
    ) => T,
    address: string,
    apiUrl: string,
    privateKey: PrivateKey,
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, privateKey, abi))
  }
}
