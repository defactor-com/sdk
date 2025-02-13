import { BaseProvider, CoreContract } from '../base-classes'
import {
  Abi,
  BuybackConstructorParams,
  ERC20CollateralPoolConstructorParams,
  PoolsConstructorParams,
  PrivateKey,
  StakingConstructorParams,
  VestingConstructorParams
} from '../types/types'

export class SelfProvider<T extends CoreContract> extends BaseProvider<T> {
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
