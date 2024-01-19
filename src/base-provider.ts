import { ERC20CollateralPool } from './erc20-collateral-pool'
import { Pools as PoolsClass } from './pools'

export abstract class BaseProvider<T extends PoolsClass | ERC20CollateralPool> {
  readonly contract: T

  constructor(c: T) {
    this.contract = c
  }
}
