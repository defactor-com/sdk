---
'@defactor/defactor-sdk': major
---

Update Counter Party Pool (CPP) artifacts and update createPool and commitToPool functions

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
    collateralTokens: []
  })
  ```

  **After**

  ```typescript
  createPool({
    softCap: BigInt(1_000000),
    hardCap: BigInt(5_000000),
    deadline: BigInt(1716407008),
    minimumAPR: BigInt(2_000000), // New required property
    collateralTokens: []
  })
  ```
