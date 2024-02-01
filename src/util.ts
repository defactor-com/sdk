import { convertBigIntToString, normalizer } from './generics'
import {
  CollateralDetails,
  Pool,
  collateralDetailsKeys,
  poolKeys
} from './types/erc20-collateral-token'

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

export const Role = {
  ADMIN: '0x' + '00'.repeat(32)
} as const

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const normalizeEcp = (pool: Pool) => {
  const normalizedPool = normalizer<Pool>(pool, poolKeys)
  normalizedPool.collateralDetails = normalizer<CollateralDetails>(
    normalizedPool.collateralDetails,
    collateralDetailsKeys
  )

  return convertBigIntToString(normalizedPool)
}
