import { ethers, Contract } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'

export type Abi = ethers.Interface | ethers.InterfaceAbi

export type Pool = {
  endTime: number
  collateralToken: string
  collateralTokenChainlink: string
  collateralTokenFactor: number
  collateralTokenPercentage: number
  interest: number
}

export type PrivateKey = string | ethers.SigningKey

const DEFAULT_ADMIN_ROLE = '0x' + '00'.repeat(32)

export class ClientProvider {
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

    const isAdmin = await this.contract.hasRole(
      DEFAULT_ADMIN_ROLE,
      this.signer.address
    )

    if (!isAdmin) {
      throw new Error('Sender address is not admin')
    }

    const action = await this.contract.addPool(pool)

    return await action.wait()
  }

  async lend() {
    // code here
  }

  async borrow() {
    // code here
  }

  async repay() {
    // code here
  }
}
