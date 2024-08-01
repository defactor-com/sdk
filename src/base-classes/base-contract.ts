import { Contract, ethers } from 'ethers'

import { miscErc20CollateralPool } from '../artifacts'
import { commonErrorMessage } from '../errors'
import { Abi, PrivateKey } from '../types/types'
import { Role } from '../utilities/util'

export type BaseContractConstructorParams = ConstructorParameters<
  typeof BaseContract
>

export abstract class BaseContract {
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
      abi || miscErc20CollateralPool.abi,
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

  protected _checkIsAdmin = async () => {
    if (this.signer) {
      const isAdmin = await this.contract.hasRole(Role.ADMIN, this.signer)

      if (!isAdmin) {
        throw new Error(commonErrorMessage.addressIsNotAdmin)
      }
    }
  }

  protected _checkIsNotPaused = async () => {
    const isPaused = await this.isPaused()

    if (isPaused) {
      throw new Error(commonErrorMessage.contractIsPaused)
    }
  }

  async isPaused(): Promise<boolean> {
    return await this.contract.paused()
  }

  async pause(): Promise<
    ethers.ContractTransaction | ethers.TransactionResponse
  > {
    await this._checkIsAdmin()

    const pop = await this.contract.pause.populateTransaction()

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async unpause(): Promise<
    ethers.ContractTransaction | ethers.TransactionResponse
  > {
    await this._checkIsAdmin()

    const pop = await this.contract.unpause.populateTransaction()

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
