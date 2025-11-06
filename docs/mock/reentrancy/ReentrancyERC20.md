# Solidity API

## ReentrancyERC20

### isTriggeredOnTransfer

```solidity
bool isTriggeredOnTransfer
```

### isTriggeredOnExclusiveDiscount

```solidity
bool isTriggeredOnExclusiveDiscount
```

### initialize

```solidity
function initialize(bool _isTriggeredOnTransfer, bool _isTriggeredOnExclusiveDiscount) public
```

### transfer

```solidity
function transfer(address _to, uint256 _value) public returns (bool)
```

### transferFrom

```solidity
function transferFrom(address _from, address _to, uint256 _value) public returns (bool)
```

### mint

```solidity
function mint(address to, uint256 amount) external
```

### exclusiveDiscount

```solidity
function exclusiveDiscount() external returns (struct IRate.Rate)
```

