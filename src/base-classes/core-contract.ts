import { Contract, ethers } from 'ethers'

import { Abi, PrivateKey } from '../types/types'

export type CoreContractConstructorParams = ConstructorParameters<
  typeof CoreContract
>

export abstract class CoreContract {
  readonly address: string
  readonly jsonRpcProvider: ethers.JsonRpcProvider
  readonly abi: Abi
  readonly contract: Contract
  readonly signer: ethers.Wallet | null
  readonly apiUrl: string

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi: Abi
  ) {
    this.contract = new Contract(
      address,
      abi,
      new ethers.JsonRpcProvider(apiUrl)
    )
    this.address = address
    this.jsonRpcProvider = new ethers.JsonRpcProvider(apiUrl)
    this.abi = abi
    this.apiUrl = apiUrl
    this.signer = privateKey
      ? new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(apiUrl))
      : null
  }
}
