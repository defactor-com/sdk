import { convertBigIntToString, normalizer } from './generics'
import {
  Borrow,
  CollateralDetails,
  Lend,
  Pool,
  borrowKeys,
  collateralDetailsKeys,
  lendingKeys,
  poolKeys
} from './types/erc20-collateral-token'

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

export const Role = {
  ADMIN: '0x' + '00'.repeat(32)
} as const

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const getUnixEpochTime = () => {
  return BigInt(Math.floor(Date.now() / 1000))
}

export const normalizePool = (pool: Pool) => {
  const normalizedPool = normalizer<Pool>(pool, poolKeys)
  normalizedPool.collateralDetails = normalizer<CollateralDetails>(
    normalizedPool.collateralDetails,
    collateralDetailsKeys
  )

  return convertBigIntToString(normalizedPool)
}

export const normalizeBorrow = (borrow: Borrow) => {
  const normalizedBorrow = normalizer<Borrow>(borrow, borrowKeys)

  return convertBigIntToString(normalizedBorrow)
}

export const normalizeLending = (loan: Lend) => {
  const normalizedLending = normalizer<Lend>(loan, lendingKeys)

  return convertBigIntToString(normalizedLending)
}
