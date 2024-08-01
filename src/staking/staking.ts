import { ContractTransaction, TransactionResponse } from 'ethers'

import { miscStaking } from '../artifacts'
import { BaseContract } from '../base-classes'
import { stakingErrorMessage } from '../errors'
import { AdminFunctions, Functions, Plan, Views } from '../types/staking'
import { Abi, PrivateKey } from '../types/types'

export class Staking
  extends BaseContract
  implements Functions, Views, AdminFunctions
{
  readonly PERCENTAGE_MULTIPLIER = BigInt(100)
  readonly MIN_STAKE_AMOUNT = BigInt('1000000000000000000000')

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscStaking.abi)
  }

  async addPlan(
    lockDuration: bigint,
    apy: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    await this._checkIsAdmin()

    if (lockDuration < 0) {
      throw new Error(stakingErrorMessage.nonNegativeLockDuration)
    }

    if (apy < 0) {
      throw new Error(stakingErrorMessage.nonNegativeApy)
    }

    const pop = await this.contract.addPlan.populateTransaction(
      lockDuration.toString(),
      apy.toString()
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async getPlans(): Promise<Array<Plan>> {
    return await this.contract.getPlans()
  }
}
