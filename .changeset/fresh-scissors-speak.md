---
"@defactor/defactor-sdk": major
---

Apply `Buyback` changes and add new `getOptimalTwapAmountThreshold` and `getOptimalAmountFromMaxAmount` functions

### Breaking changes

#### Details

- `collectionArray` from `CustomBuybackStruct` was removed
- `buyback` function from `Buyback` class receives a `providedOptimalAmount` as parameter
