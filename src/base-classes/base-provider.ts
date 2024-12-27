import { Buyback } from '../buyback/buyback'
import { ERC20CollateralPool } from '../pools/erc20-collateral-pool'
import { Pools as PoolsClass } from '../pools/pools'
import { Staking } from '../staking/staking'
import { Vesting } from '../vesting/vesting'

export abstract class BaseProvider<
  T extends PoolsClass | ERC20CollateralPool | Staking | Buyback | Vesting
> {
  readonly contract: T

  constructor(c: T) {
    this.contract = c
  }
}
