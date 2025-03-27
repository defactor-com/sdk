import { ethers } from 'ethers'

import { commonErrorMessage } from '../errors'
import { Abi, PrivateKey, RoleOption } from '../types/types'
import { Role } from '../utilities/util'
import { CoreContract } from './core-contract'

export type BaseContractConstructorParams = ConstructorParameters<
  typeof BaseContract
>

export abstract class BaseContract extends CoreContract {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi: Abi
  ) {
    super(address, apiUrl, privateKey, abi)
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

  async grantRole(
    role: RoleOption,
    address: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkIsAdmin()

    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const pop = await this.contract.grantRole.populateTransaction(role, address)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async revokeRole(
    role: RoleOption,
    address: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsNotPaused()
    await this._checkIsAdmin()

    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const pop = await this.contract.revokeRole.populateTransaction(
      role,
      address
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
