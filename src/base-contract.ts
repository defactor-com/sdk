import { ethers, Contract } from 'ethers'

import { miscErc20CollateralPool } from './artifacts'
import { Abi, PrivateKey } from './types/types'

export type BaseContractConstructorParams = ConstructorParameters<
  typeof BaseContract
>

export abstract class BaseContract {
  readonly address: string
  readonly jsonRpcProvider: ethers.JsonRpcProvider
  readonly abi: Abi
  readonly contract: Contract
  readonly signer: ethers.Wallet | null

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    this.contract = new Contract(
      address,
      abi || miscErc20CollateralPool.abi,
      new ethers.JsonRpcProvider(apiUrl)
    )
    this.address = address
    this.jsonRpcProvider = new ethers.JsonRpcProvider(apiUrl)
    this.abi = abi || miscErc20CollateralPool.abi
    this.signer = privateKey
      ? new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(apiUrl))
      : null
  }
}
