import { ethers, Contract } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'
import { Pool } from './types/erc20-collateral-token'
import { Abi, PrivateKey } from './types/types'
import { Role } from './provider-utilities'

export { Abi, PrivateKey, Pool }

export class SelfProvider {
  readonly signer: ethers.Wallet
  readonly contract: Contract
  readonly contractAddress: string
  readonly provider: ethers.JsonRpcProvider
  readonly abi: Abi

  constructor(
    contractAddress: string,
    apiUrl: string,
    privateKey: PrivateKey,
    abi?: Abi
  ) {
    this.contractAddress = contractAddress
    this.provider = new ethers.JsonRpcProvider(apiUrl)
    this.abi = abi || miscErc20CollateralPool.abi
    this.signer = new ethers.Wallet(privateKey, this.provider)
    this.contract = new Contract(
      contractAddress,
      miscErc20CollateralPool.abi,
      this.signer
    )
  }

  async LIQUIDATION_PROTOCOL_FEE() {
    const liquidationProtocolFee =
      await this.contract.LIQUIDATION_PROTOCOL_FEE()

    return BigInt(liquidationProtocolFee)
  }

  async createPool(pool: Pool) {
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

    const isAdmin = await this.contract.hasRole(Role.ADMIN, this.signer.address)

    if (!isAdmin) {
      throw new Error('Sender address is not admin')
    }

    const action = await this.contract.addPool(pool)

    return await action.wait()
  }
}
