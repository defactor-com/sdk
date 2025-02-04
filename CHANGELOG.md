# @defactor-com/defactor-sdk

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
