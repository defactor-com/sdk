import { miscStakingV2 } from '../artifacts'
import { BaseContract } from '../base-classes'
import { Abi, PrivateKey } from '../types/types'

export class StakingV2 extends BaseContract {
  readonly PERCENTAGE_MULTIPLIER = BigInt(100)
  readonly RATIO_DECIMALS_DIVIDER = BigInt('1000000000000000000')

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscStakingV2.abi)
  }
}
