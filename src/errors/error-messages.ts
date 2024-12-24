export const commonErrorMessage = {
  contractIsPaused: 'The contract is paused',
  addressIsNotAdmin: 'Sender address is not admin',
  wrongAddressFormat: `Address does not follow the ethereum address format`,
  nonGreaterThan: (valueName: string, maxValue: string) =>
    `The ${valueName} value cannot be greater than ${maxValue}`,
  invalidToken: 'Invalid token address',
  invalidBytesLike: 'The string value is not a valid BytesLike representation',
  nonNegativeValue: 'Value cannot be negative'
}

export const poolCommonErrorMessage = {
  noExistPoolId: (poolId: bigint) =>
    `Pool id ${poolId.toString()} does not exist`,
  noSupportedPoolStatus: (poolStatus: bigint) =>
    `The status ${poolStatus.toString()} is not supported`,
  noNegativeAmountOrZero: 'Amount cannot be negative or 0'
}

export const erc20CollateralPoolErrorMessage = {
  wrongAddressFormatCustom: (text?: string) =>
    `Collateral token${text ? ' ' + text : ''} does not follow the ethereum address format`,
  noExistLendingId: (lendingId: bigint) =>
    `Lending id ${lendingId.toString()} does not exist`,
  noExistBorrowId: (borrowId: bigint) =>
    `Borrow id ${borrowId.toString()} does not exist`,
  noNegativeOffset: 'Offset cannot be negative',
  noNegativeLimitOrZero: 'Limit cannot be negative or 0',
  maxLimitAllowed: 'Max limit allowed is 1000',
  maxLentIsReached: 'Max lent is reached',
  endTimeReached: 'Pool has ended',
  poolIsNotClosed: 'Pool is not closed',
  poolIsClosed: 'Pool is closed',
  poolIsNotCompleted: 'Pool is not completed',
  loanAlreadyClaimed: 'Loan already claimed',
  poolCannotBeLiquidated: 'Pool cannot be liquidated',
  timeMustBeInFuture: 'Time must be in the future',
  amountOverpassPoolBalance: 'Amount overpass the pool available amount',
  borrowAlreadyRepaid: 'Borrow already repaid',
  amountTooLow: 'The amount is less than or equal to the minimum',
  minLentMustBeLessThanMaxLent:
    'The min lent amount must be less than max lent amount',
  minBorrowMustBeLessThanMaxLent:
    'The min borrow amount must be less than max lent amount'
}

export const counterPartyPoolErrorMessage = {
  addressIsNotOwner: 'Sender address is not the owner of the pool',
  poolOwnerCannotCommitToTheirOwnPool:
    'The pool owner cannot make a commit on their own pool',
  softCapMustBeLessThanHardCap: 'Soft cap must be less than hard cap',
  deadlineMustBeInFuture: 'Deadline must be in the future',
  deadlineMustNotBeMoreThan1YearInTheFuture:
    'Deadline must not be more than one year in the future',
  noNegativeSoftCap: 'Soft cap cannot be negative',
  noNegativeMinimumAPR: 'Minimum APR cannot be negative',
  deadlineReached: 'Deadline has been reached',
  deadlineNotReached: 'Deadline not reached',
  softCapReached: 'Soft cap reached',
  softCapNotReached: 'Soft cap not reached',
  deadlineAndSoftCapReached: 'Deadline and soft cap reached',
  amountExceedsHardCap: 'The amount exceeds the harp cap',
  mustDepositAtLeastCommittedAmount: 'Must deposit at least committed amount',
  poolHasNoRewards: 'No rewards have been deposited into the pool',
  poolOwnerCannotClaimToTheirOwnPool:
    'The pool owner cannot make a claim on their own pool',
  mustCommitBeforeClaim: 'Must commit to pool before to claim rewards',
  poolOwnerCannotUncommitToTheirOwnPool:
    'The pool owner cannot make an un-commit on their own pool',
  poolHasNoCommittedAmount: 'No amount has been committed to the pool',
  poolAlreadyClaimed: 'Pool rewards have already been claimed',
  committedAmountMustBeZero: 'The committed amount must be zero',
  rewardsHaveNotYetBeenPaidOut: 'Rewards have not yet been paid',
  cannotArchiveBeforeClosedTime: (days: bigint) =>
    `${days} days must have passed after the closed time to archive the pool`,
  cannotArchiveBeforeDeadline: (days: bigint) =>
    `${days} days must have passed after the deadline to archive the pool`,
  mustBeOwnerOrAdmin:
    'Sender address is not the owner of the pool or the admin',
  cannotCollectDaysAfterDeadline: (days: bigint) =>
    `Cannot collect ${days} days after deadline`,
  poolStatusMustBe: (
    poolId: bigint,
    poolStatus: string,
    expectedStatus: Array<string>
  ) =>
    `Pool ${poolId.toString()} status is ${poolStatus}, it must be ${expectedStatus.sort().join(', or ')}`
}

export const stakingErrorMessage = {
  nonNegativeLockDuration: 'Lock duration cannot be negative',
  nonNegativeApy: 'APY cannot be negative',
  nonNegativePlanExpiration: 'Plan expiration cannot be negative',
  invalidPlanId: 'Invalid plan id',
  planHasExpired: 'The plan has expired',
  stakeAmountTooLow: 'Stake amount too low',
  stakingHasEnded: 'Staking has ended',
  stakeAlreadyUnstaked: 'Stake already unstaked',
  stakeIsLocked: 'Stake is locked',
  invalidStakeIndex: 'Invalid stake index',
  stakingCantBeLessThanRewardsEnd:
    'Staking end time cannot be less than rewards end time',
  nonNegativeIndexId: 'Neither Index nor Id can be negative',
  nonNegativeDates: 'Neither staking nor reward end date can be negative'
}

export const buybackErrorMessage = {
  nonNegativeBuybackId: 'Buyback id cannot be negative',
  nonNegativeAmountOrZero: 'Amount cannot be negative or 0',
  nonNegativeSecondsOrZero: 'Seconds cannot be negative or 0',
  nonNegativeOrZeroBps: 'Bps cannot be negative or 0',
  nonExistBuybackId: (buybackId: bigint) =>
    `Buyback id ${buybackId.toString()} does not exist`,
  nonExistCustomBuybackId: (buybackId: bigint) =>
    `Custom buyback id ${buybackId.toString()} does not exist`,
  buybackConstraint: 'USDC Balance should be at least 1000',
  collectionBpsConstraint: 'Sum of BPSs should equal 100%',
  unlockPeriodNotFinished: 'Unlock period not finished',
  alreadyWithdrawn: 'Unlock already withdrawn',
  addressIsNotRecoverer: 'Sender address is not recoverer address'
}

export const vestingErrorMessage = {
  addressIsNotOperator: 'Sender is not operator',
  nonNegativeAmountOrZero: 'Amount cannot be negative or 0',
  leafsArrayIsEmpty: 'The leafs array cannot be empty',
  onlyBeneficiaryOrOperator:
    'Only beneficiary and operator can release vested tokens'
}
