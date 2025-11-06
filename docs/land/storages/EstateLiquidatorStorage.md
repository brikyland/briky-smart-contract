# Solidity API

## EstateLiquidatorStorage

@author Briky Team

 @notice Storage contract for contract `EstateLiquidator`.

### requests

```solidity
mapping(uint256 => struct IEstateLiquidatorRequest.EstateLiquidatorRequest) requests
```

_requests[requestId]_

### requestNumber

```solidity
uint256 requestNumber
```

Name             Description
 @return requestNumber    Number of requests.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### dividendHub

```solidity
address dividendHub
```

Name            Description
 @return dividendHub     `DividendHub` contract address.

### estateToken

```solidity
address estateToken
```

Name            Description
 @return estateToken     `EstateToken` contract address.

### feeReceiver

```solidity
address feeReceiver
```

Name            Description
 @return feeReceiver     `FeeReceiver` contract address.

### governanceHub

```solidity
address governanceHub
```

Name            Description
 @return governanceHub   `GovernanceHub` contract address.

