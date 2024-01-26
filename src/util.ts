export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

export const Role = {
  ADMIN: '0x' + '00'.repeat(32)
} as const

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
