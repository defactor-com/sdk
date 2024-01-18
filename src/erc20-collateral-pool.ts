import { ethers } from 'ethers'

import { Pool } from './types/erc20-collateral-token'
import { Abi, PrivateKey } from './types/types'
import { Role } from './provider-utilities'
import { BaseContract } from './base-contract'

export class ERC20CollateralPool extends BaseContract {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi)
  }

  async LIQUIDATION_PROTOCOL_FEE(): Promise<bigint> {
    const liquidationProtocolFee =
      await this.contract.LIQUIDATION_PROTOCOL_FEE()

    return BigInt(liquidationProtocolFee)
  }

  async createPool(
    pool: Pool
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (!ethers.isAddress(pool.collateralToken)) {
      throw new Error(
        'Collateral token does not follow the ethereum address format'
      )
    }

    if (!ethers.isAddress(pool.collateralTokenChainlink)) {
      throw new Error(
        'Collateral token chainlink does not follow the ethereum address format'
      )
    }

    if (this.signer) {
      const isAdmin = await this.contract.hasRole(Role.ADMIN, this.signer)

      if (!isAdmin) {
        throw new Error('Sender address is not admin')
      }
    }

    const pop = await this.contract.addPool.populateTransaction(pool)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
