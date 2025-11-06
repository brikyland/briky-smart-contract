# Solidity API

## AdminStorage

@author Briky Team

 @notice Storage contract for contract `Admin`.

### isManager

```solidity
mapping(address => bool) isManager
```

_isManager[account]_

### nonce

```solidity
uint256 nonce
```

Name    Description
 @return nonce   Number used once in the next verification.

### admin1

```solidity
address admin1
```

Name    Description
 @return admin1  Admin #1 address.

### admin2

```solidity
address admin2
```

Name    Description
 @return admin2  Admin #2 address.

### admin3

```solidity
address admin3
```

Name    Description
 @return admin3  Admin #3 address.

### admin4

```solidity
address admin4
```

Name    Description
 @return admin4  Admin #4 address.

### admin5

```solidity
address admin5
```

Name    Description
 @return admin5  Admin #5 address.

### isModerator

```solidity
mapping(address => bool) isModerator
```

_isModerator[account]_

### currencyRegistries

```solidity
mapping(address => struct ICurrencyRegistry.CurrencyRegistry) currencyRegistries
```

_currencyRegistries[currency]_

### isZone

```solidity
mapping(bytes32 => bool) isZone
```

_isZone[zone]_

### isActiveIn

```solidity
mapping(bytes32 => mapping(address => bool)) isActiveIn
```

_isActiveIn[zone][account]_

### isGovernor

```solidity
mapping(address => bool) isGovernor
```

_isGovernor[account]_

