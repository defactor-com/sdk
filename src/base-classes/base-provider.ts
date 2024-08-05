import { ERC20CollateralPool } from '../pools/erc20-collateral-pool'
import { Pools as PoolsClass } from '../pools/pools'
import { Staking } from '../staking/staking'

export abstract class BaseProvider<
  T extends PoolsClass | ERC20CollateralPool | Staking
> {
  readonly contract: T

  constructor(c: T) {
    this.contract = c
  }
}
