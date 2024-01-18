import { Abi, PrivateKey } from './types/types'
import { BaseContract } from './base-contract'

export class Pools extends BaseContract {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi)
  }
}
