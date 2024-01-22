import { ethers } from 'ethers'

import { miscErc20, miscPools } from './artifacts'
import { BaseContract, Erc20CollateralTokenPoolDetail } from './base-contract'
import { Functions, Pool, PoolCommit, PoolInput } from './types/pools'
import { Abi, PrivateKey } from './types/types'

export class Pools extends BaseContract implements Functions {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscPools.abi)
  }

  async USD_ADDRESS(): Promise<string> {
    return await this.contract.USDC()
  }

  // TODO: make a private version of this function that returns boolean instead of throwing an error
  async getPool(poolId: bigint): Promise<Pool> {
    const pool: Pool = await this.contract.pools(poolId)

    if (pool.createdAt === BigInt(0)) {
      throw new Error(`Pool id ${poolId.toString()} does not exist`)
    }

    return pool
  }

  async getPools(offset: bigint, limit: bigint): Promise<Array<Pool>> {
    const poolsResponse = new Array<Pool>()

    for (let i = offset; i < offset + limit; i++) {
      const pool = await this.getPool(i)
      poolsResponse.push(pool)
    }

    return poolsResponse
  }

  getPoolDetails(
    poolId: bigint,
    walletAddress: string
  ): Promise<Erc20CollateralTokenPoolDetail | PoolCommit> {
    throw new Error(
      `Method not implemented. ${poolId.toString()}, ${walletAddress}`
    )
  }

  pause(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  unpause(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async createPool(
    pool: PoolInput
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (pool.softCap >= pool.hardCap) {
      throw new Error('Hard cap must be greater than soft cap')
    }

    // TODO: Validate contract has <= validation, should this logic use the same validation
    // since the time when the library is called is different than the time when the contract is called
    // and execute the transaction
    if (pool.deadline > BigInt(Date.now())) {
      throw new Error('Deadline must be greater than current time')
    }

    // TODO: add validation of balance
    // Convert BigInt values to strings
    const formattedPool = {
      softCap: pool.softCap.toString(),
      hardCap: pool.hardCap.toString(),
      deadline: pool.deadline,
      collateralTokens: pool.collateralTokens.map(token => [
        token.contractAddress,
        token.amount.toString(),
        token.id ? token.id.toString() : 0
      ])
    }

    for (const token of pool.collateralTokens) {
      const erc20Contract = new ethers.Contract(
        token.contractAddress,
        miscErc20.abi,
        this.signer
      )

      // TODO: instead of hardcoding 200_000000 POOL_FEES, read the value from the contract
      // TODO: provide this function as a populateTransaction and signed transaction
      // TODO: adapt this logic to accept this.signer be null (assisted-provider)
      await erc20Contract.approve(
        this.address,
        (token.amount + BigInt(200_000000)).toString()
      )
    }

    // TODO: move this logic to utils file
    const sleep = (ms: number): Promise<void> => {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    await sleep(3000)

    const pop = await this.contract.createPool.populateTransaction(
      formattedPool.softCap,
      formattedPool.hardCap,
      formattedPool.deadline,
      formattedPool.collateralTokens
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  collectPool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  depositRewards(poolId: bigint, amount: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId}, ${amount}`)
  }

  closePool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  archivePool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  commitToPool(poolId: bigint, amount: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId}, ${amount}`)
  }

  uncommitFromPool(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }

  claim(poolId: bigint): Promise<void> {
    throw new Error(`Method not implemented. ${poolId.toString()}`)
  }
}
