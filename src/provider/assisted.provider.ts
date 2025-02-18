import { miscErc20CollateralPool } from '../artifacts'
import { BaseProvider, CoreContract } from '../base-classes'
import {
  Abi,
  BuybackConstructorParams,
  ERC20CollateralPoolConstructorParams,
  PoolsConstructorParams,
  StakingConstructorParams,
  VestingConstructorParams
} from '../types/types'

export class AssistedProvider<T extends CoreContract> extends BaseProvider<T> {
  readonly abi: Abi

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
    abi?: Abi
  ) {
    super(new contractBuilder(address, apiUrl, null, abi))

    this.abi = abi || miscErc20CollateralPool.abi
  }
}
