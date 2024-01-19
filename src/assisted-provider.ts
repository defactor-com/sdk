import { Pool } from './types/erc20-collateral-token'
import { Abi, PrivateKey } from './types/types'
import { BaseProvider } from './base-provider'
import { Pools as PoolsClass } from './pools'
import { ERC20CollateralPool } from './erc20-collateral-pool'
import { miscErc20CollateralPool } from './artifacts'
import { BaseContractConstructorParams } from './base-contract'

export { Abi, PrivateKey, Pool }

export class AssistedProvider<
  T extends PoolsClass | ERC20CollateralPool
> extends BaseProvider<T> {
  readonly abi: Abi

  constructor(
    contractBuilder: new (...args: BaseContractConstructorParams) => T,
    address: string,
    apiUrl: string,
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, null, abi))

    this.abi = abi || miscErc20CollateralPool.abi
  }
}
