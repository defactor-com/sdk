import { ethers } from 'ethers'

import { miscErc20 } from './artifacts'
import { BaseContract } from './base-contract'
import { ecpErrorMessage } from './error-messages'
import { Abi, PrivateKey } from './types/types'

export class Erc20 extends BaseContract {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscErc20.abi)
  }

  async balanceOf(address: string): Promise<bigint> {
    return await this.contract.balanceOf(address)
  }

  async approve(
    address: string,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (!ethers.isAddress(address)) {
      throw new Error(
        'Collateral token does not follow the ethereum address format'
      )
    }

    if (amount < 0) {
      throw new Error(ecpErrorMessage.noNegativeAmountOrZero)
    }

    const pop = await this.contract.approve.populateTransaction(address, amount)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
