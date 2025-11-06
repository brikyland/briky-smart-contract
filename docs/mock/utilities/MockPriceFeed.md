# Solidity API

## MockPriceFeed

### decimals

```solidity
uint8 decimals
```

### initialize

```solidity
function initialize(int256 _answer, uint8 _decimals) public
```

### description

```solidity
function description() external pure returns (string)
```

### version

```solidity
function version() external pure returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80, int256 _answer, uint256 _startedAt, uint256 _updatedAt, uint80 _answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 _roundId, int256 _answer, uint256 _startedAt, uint256 _updatedAt, uint80 _answeredInRound)
```

### updateAnswer

```solidity
function updateAnswer(int256 _newAnswer) external
```

### updateDecimals

```solidity
function updateDecimals(uint8 _newDecimals) external
```

### updateData

```solidity
function updateData(int256 _newAnswer, uint8 _newDecimals) external
```

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public pure returns (bool)
```

