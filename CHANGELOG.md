# @defactor-com/defactor-sdk

## 7.3.1

### Patch Changes

- 40f6e08: Fix withdraw protocol rewards function

## 7.3.0

### Minor Changes

- 0d2c586: Update erc20-collateral-contract to support new structure for events: Repaid, newBorrow and newLend

## 7.2.0

### Minor Changes

- c6371fa: Update abi: include borrowId for Repaid event and lendId for RewardsClaimed event

## 7.1.0

### Minor Changes

- d16d994: Improve getOptimalAmountFromMaxAmount function performance

## 7.0.0

### Major Changes

- 22bd22d: Add `ERC20CollateralPoolV2` to support the new contract version, apply `StakingV2` changes and modify `Stake` position type

  ### Breaking changes

  #### Details

  ##### BuybackV2

  - Update `miscBuyback` abi

  ##### ERC20CollateralPoolV2

  - Add `ERC20CollateralPoolV2` class with its new types, abi and logic
  - Rename old `ERC20CollateralPool` to `ERC20CollateralPoolV1`

  **Before**

  ```typescript
  new ERC20CollateralPool(
    ERC20_COLLATERAL_POOL_CONTRACT_ADDRESS,
    PROVIDER_URL,
    PRIVATE_KEY,
    miscErc20CollateralPool.abi,
  );
  ```

  **After**

  ```typescript
  new ERC20CollateralPoolV1(
    ERC20_COLLATERAL_POOL_CONTRACT_ADDRESS,
    PROVIDER_URL,
    PRIVATE_KEY,
    miscErc20CollateralPoolV1.abi,
  );
  ```

  ##### StakingV2

  - Update `Stake` from `StakingV2` types
  - Add new dates validation into `addPlan`
  - Update `stake`, `restake`, `claimRewards` and `claimAllRewards` validations
  - Remove `withdraw` function

## 6.0.0

### Major Changes

- 4659ecb: Apply `Buyback` changes and add new `getOptimalTwapAmountThreshold` and `getOptimalAmountFromMaxAmount` functions

  ### Breaking changes

  #### Details

  - `collectionArray` from `CustomBuybackStruct` was removed
  - `buyback` function from `Buyback` class receives a `providedOptimalAmount` as parameter

## 5.0.0

### Major Changes

- 3a20063: Support new version of the Staking contract

  ### Breaking changes

  - Rename `Staking` class and artifacts to `StakingV1`

  #### Details

  - To migrate from older versions it is needed to rename every `Staking` reference to `StakingV1` in order to interact with the first version of the Staking contracts.

  **Before**

      ```typescript
      new Staking(STAKING_CONTRACT_ADDRESS, PROVIDER_URL, PRIVATE_KEY, miscStaking.abi);
      ```

      **After**

      ```typescript
      new StakingV1(STAKING_CONTRACT_ADDRESS, PROVIDER_URL, PRIVATE_KEY, miscStakingV1.abi);
      ```

## 4.1.0

### Minor Changes

- beb97b0: Add new vesting contract version with events

## 4.0.4

### Patch Changes

- 0bf161b: Add support to `vesting` contract

  - Include `OPERATOR` role in the `Role` utility object
  - Add `Vesting` class to support Vesting contract functions

## 4.0.3

### Patch Changes

- 8f5531c: Add support to Staking contract version with expiring plans

  - Extend `Plan` type to include optional `expires` attribute
  - Add `StakingExpiration` to support the version with expiring plans

## 4.0.2

### Patch Changes

- 234ca7d: Add support to multiple contract actions for the `buyback` contract

## 4.0.1

### Patch Changes

- 787762f: Update the abi of the `erc20 collateral pool` contract to fix interest format

## 4.0.0

### Major Changes

- 46f0f63: Support new version of the ERC20 Collateral Pool contract

  ### Breaking changes

  - Add functions `getLiquidatableAmountWithProtocolFee` and `liquidateUserPosition` into `ERC20CollateralPool` class.
  - Now `liquidatePool` function requires `DEFAULT_ADMIN_ROLE`.
  - The collateral details in `ERC20CollateralPool` class that implements the erc20 collateral pool contract now require `maxLended`, `minLended`, and `minBorrow`.
  - The `LIQUIDATION_FEE` in the `ERC20CollateralPool` base class has changed from 5 to 10.
  - The `OZ_IN_G` was removed from the `ERC20CollateralPool` base class and the classes from which it inherits.

## 3.1.0

### Minor Changes

- bff8633: Add support for top lend constrain for erc20 collateral pool contract

## 3.0.6

### Patch Changes

- 1ba24e3: Add grantRole and revokeRole functions to base contract class

## 3.0.5

### Patch Changes

- 8509dbc: Update staking abi to include DatesUpdated new event

## 3.0.4

### Patch Changes

- faa0717: Fix `setDates` staking function and add to staking class `getRewardsEndTime`, `getTotalFactrStaked`, and `getBaseTokenAddress` functions to get smart contract configuration values.

## 3.0.3

### Patch Changes

- 38f2765: Add staking as an accepted type

## 3.0.2

### Patch Changes

- c1cd772: Add staking to the export index

## 3.0.1

### Patch Changes

- cdbd59c: Update staking contract abi

## 3.0.0

### Major Changes

- 7a891a0: Update type format export

## 2.0.0

### Major Changes

- 60c5f31: Update type format export

## 1.2.1

### Patch Changes

- 4fac6d3: Add support to multiple contract actions for the staking contract

## 1.2.0

### Minor Changes

- 2aeaf34: Export staking contract abi in Artifacts object

## 1.1.0

### Minor Changes

- a14ab1d: Implement a custom version of the Counterparty Pools (CPP) where only the admin can create the pools

## 1.0.0

### Major Changes

- b272abb: Update Counter Party Pool (CPP) artifacts and update createPool and commitToPool functions

  ### Breaking changes

  - `Pool`, `ContractPool`, `PoolInput` types have a new required property `minimumAPR`.

    #### Details

    - In version 1.0.0 the `minimumAPR` was added to Pools data types in order to update the integration with the Counter Party Pool (CPP) contract. For this reason, `createPool` function now requires the `minimumAPR` parameter.

    **Before**

    ```typescript
    createPool({
      softCap: BigInt(1_000000),
      hardCap: BigInt(5_000000),
      deadline: BigInt(1716407008),
      collateralTokens: [],
    });
    ```

    **After**

    ```typescript
    createPool({
      softCap: BigInt(1_000000),
      hardCap: BigInt(5_000000),
      deadline: BigInt(1716407008),
      minimumAPR: BigInt(2_000000), // New required property
      collateralTokens: [],
    });
    ```

### Patch Changes

- 32fc982: Implement archivePool function for the Counter Party Pool (CPP)
- 08356cf: Implement depositRewards function for the Counter Party Pool (CPP)
- cded420: Implement uncommitFromPool function for the Counter Party Pool (CPP)
- 481b053: Implement claim function for the Counter Party Pool (CPP)
- 264118a: Implement closePool function for the Counter Party Pool (CPP)

## 0.3.2

### Patch Changes

- 8d49eb9: Implement CollectPool function for the Counter Party Pool (CPP)

## 0.3.1

### Patch Changes

- 3ead5a6: Reorganize the folder structure

## 0.3.0

### Minor Changes

- 73a901c: Implement createPool, commitToPool and fix getPool for the Counter Party Pool (CPP)

## 0.2.3

### Patch Changes

- 3b92891: Update abi

## 0.2.2

### Patch Changes

- b34ee17: implement claimRewards method

## 0.2.1

### Patch Changes

- 3e992c8: Update abi with new contract structure

## 0.2.0

### Minor Changes

- b7fed46: return `more` attribute in the functions that uses pagination to indicate if there is any data left to fetch

## 0.1.3

### Patch Changes

- 93b71f3: Add normalizer for borrow and lend object, also create a new type of liquidation info object

## 0.1.2

### Patch Changes

- b1d4509: Add generics file to the export index

## 0.1.1

### Patch Changes

- 6e889a4: Create export for Erc20 class

## 0.1.0

### Minor Changes

- 2abf83a: Update library export structure, create new implementation to extend the coverage of the smart contract functionalities and support loans interaction

## 0.0.5

### Patch Changes

- 0b22d80: Export types object for library types and add it to general export

## 0.0.4

### Patch Changes

- 3a22533: Improve the export format

## 0.0.3

### Patch Changes

- 84dbf13: Export components individually and also as part of the DefactorSDK kit

## 1.0.0

### Major Changes

- a3f519d: Update project structure and implement class abstraction

## 0.0.7

### Patch Changes

- 08566a5: configure ci/cd workflows
