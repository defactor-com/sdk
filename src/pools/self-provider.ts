import { BaseProvider } from '../base-classes'
import {
  Abi,
  ERC20CollateralPoolConstructorParams,
  PoolsConstructorParams,
  PrivateKey
} from '../types/types'
import { ERC20CollateralPool } from './erc20-collateral-pool'
import { Pools as PoolsClass } from './pools'

export class SelfProvider<
  T extends PoolsClass | ERC20CollateralPool
> extends BaseProvider<T> {
  constructor(
    contractBuilder: new (
      ...args: PoolsConstructorParams | ERC20CollateralPoolConstructorParams
    ) => T,
    address: string,
    apiUrl: string,
    privateKey: PrivateKey,
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, privateKey, abi))
  }
}
