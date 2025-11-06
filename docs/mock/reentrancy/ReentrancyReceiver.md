# Solidity API

## ReentrancyReceiver

### isTriggeredOnReceive

```solidity
bool isTriggeredOnReceive
```

### isTriggeredOnERC1155Receive

```solidity
bool isTriggeredOnERC1155Receive
```

### initialize

```solidity
function initialize(bool _isTriggeredOnReceive, bool _isTriggeredOnERC1155Receive) public
```

### receive

```solidity
receive() external payable
```

### onERC1155Received

```solidity
function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _value, bytes _data) public returns (bytes4)
```

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address _operator, address _from, uint256[] _ids, uint256[] _values, bytes _data) public returns (bytes4)
```

