import { Pool } from './types/erc20-collateral-token'
import { Abi, PrivateKey } from './types/types'
import { BaseProvider } from './base-provider'
import { BaseContractConstructorParams } from './base-contract'
import { Pools as PoolsClass } from './pools'
import { ERC20CollateralPool } from './erc20-collateral-pool'

export { Abi, PrivateKey, Pool }

export class SelfProvider<
  T extends PoolsClass | ERC20CollateralPool
> extends BaseProvider<T> {
  constructor(
    contractBuilder: new (...args: BaseContractConstructorParams) => T,
    address: string,
    apiUrl: string,
    privateKey: PrivateKey,
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, privateKey, abi))
  }
}
