# Solidity API

## FailReceiver

### isActive

```solidity
bool isActive
```

### isActiveRejectERC1155

```solidity
bool isActiveRejectERC1155
```

### initialize

```solidity
function initialize(bool _isActive, bool _isActiveRejectERC1155) external
```

### receive

```solidity
receive() external payable
```

### activate

```solidity
function activate(bool _isActive) external
```

### activateRejectERC1155

```solidity
function activateRejectERC1155(bool _isActiveRejectERC1155) external
```

### onERC1155Received

```solidity
function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _value, bytes _data) public returns (bytes4)
```

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address _operator, address _from, uint256[] _ids, uint256[] _values, bytes _data) public returns (bytes4)
```

