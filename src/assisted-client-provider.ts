import { ethers, Contract } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'

type Abi = ethers.Interface | ethers.InterfaceAbi

export class AssistedClientProvider {
  readonly contract: Contract
  readonly contractAddress: string
  readonly provider: ethers.JsonRpcProvider
  readonly abi: Abi

  constructor(contractAddress: string, apiUrl: string, abi?: Abi) {
    this.contractAddress = contractAddress
    this.provider = new ethers.JsonRpcProvider(apiUrl)
    this.abi = abi || miscErc20CollateralPool.abi

    this.contract = new Contract(
      contractAddress,
      miscErc20CollateralPool.abi,
      this.provider
    )
  }

  async LIQUIDATION_PROTOCOL_FEE() {
    const liquidationProtocolFee =
      await this.contract.LIQUIDATION_PROTOCOL_FEE()

    return BigInt(liquidationProtocolFee)
  }
}
