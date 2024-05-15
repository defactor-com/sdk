import { miscErc20CollateralPool } from '../artifacts'
import { BaseProvider } from '../base-classes/base-provider'
import {
  Abi,
  ERC20CollateralPoolConstructorParams,
  PoolsConstructorParams
} from '../types/types'
import { ERC20CollateralPool } from './erc20-collateral-pool'
import { Pools as PoolsClass } from './pools'

export class AssistedProvider<
  T extends PoolsClass | ERC20CollateralPool
> extends BaseProvider<T> {
  readonly abi: Abi

  constructor(
    contractBuilder: new (
      ...args: PoolsConstructorParams | ERC20CollateralPoolConstructorParams
    ) => T,
    address: string,
    apiUrl: string,
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, null, abi))

    this.abi = abi || miscErc20CollateralPool.abi
  }
}
