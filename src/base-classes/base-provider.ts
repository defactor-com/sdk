import { CoreContract } from './core-contract'

export abstract class BaseProvider<T extends CoreContract> {
  readonly contract: T

  constructor(c: T) {
    this.contract = c
  }
}
