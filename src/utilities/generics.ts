/* eslint-disable @typescript-eslint/no-explicit-any */
import { WithoutBigInt } from '../types/types'

export const normalizer = <T extends { [K in keyof T]: T[K] }>(
  input: T,
  keys: Array<keyof T>
): T => {
  const newObj: Partial<T> = {}

  for (let i = 0; i < keys.length; i++) {
    newObj[keys[i]] = input[keys[i]]
  }

  return newObj as T
}

export const convertBigIntToString = <T>(obj: T): WithoutBigInt<T> => {
  if (obj === null || obj === undefined) {
    return obj as unknown as WithoutBigInt<T>
  }

  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as WithoutBigInt<T>
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString) as unknown as WithoutBigInt<T>
  }

  if (typeof obj === 'object') {
    const newObj: any = {}

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = convertBigIntToString((obj as any)[key])
      }
    }

    return newObj as WithoutBigInt<T>
  }

  return obj as WithoutBigInt<T>
}
