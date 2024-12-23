import { miscVesting } from '../artifacts'
import { BaseContract } from '../base-classes'
import { vestingErrorMessage } from '../errors'
import { Abi, PrivateKey } from '../types/types'
import { Role } from '../utilities/util'

export class Vesting extends BaseContract {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscVesting.abi)
  }

  protected _checkIsOperator = async () => {
    if (this.signer) {
      const isOperator = await this.contract.hasRole(Role.OPERATOR, this.signer)

      if (!isOperator) {
        throw new Error(vestingErrorMessage.addressIsNotOperator)
      }
    }
  }
}
