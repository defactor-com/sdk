import { ethers } from 'ethers'

export type Abi = ethers.Interface | ethers.InterfaceAbi

export type PrivateKey = string | ethers.SigningKey
