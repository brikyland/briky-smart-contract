# Solidity API

## Governor

### balanceSnapshots

```solidity
mapping(uint256 => mapping(address => struct Governor.Snapshot[])) balanceSnapshots
```

### zones

```solidity
mapping(uint256 => bytes32) zones
```

### custodians

```solidity
mapping(uint256 => address) custodians
```

### admin

```solidity
address admin
```

### Snapshot

```solidity
struct Snapshot {
  uint256 value;
  uint256 timestamp;
}
```

### InvalidTokenId

```solidity
error InvalidTokenId()
```

### receive

```solidity
receive() external payable
```

### initialize

```solidity
function initialize(address _admin) external
```

### setZone

```solidity
function setZone(uint256 _tokenId, bytes32 _zone) external
```

### setCustodian

```solidity
function setCustodian(uint256 _tokenId, address _custodian) external
```

### mint

```solidity
function mint(uint256 _tokenId, uint256 _amount) external
```

### burn

```solidity
function burn(uint256 _tokenId, uint256 _amount) external
```

### zoneOf

```solidity
function zoneOf(uint256 _tokenId) external view returns (bytes32)
```

### isAvailable

```solidity
function isAvailable(uint256 _tokenId) external view returns (bool)
```

### getRepresentative

```solidity
function getRepresentative(uint256 _tokenId) external view returns (address)
```

### balanceOf

```solidity
function balanceOf(address _account, uint256 _tokenId) public view returns (uint256)
```

### balanceOfAt

```solidity
function balanceOfAt(address _account, uint256 _tokenId, uint256 _at) public view returns (uint256)
```

### totalSupply

```solidity
function totalSupply(uint256 _tokenId) public view returns (uint256)
```

### totalEquityAt

```solidity
function totalEquityAt(uint256 _tokenId, uint256) external view returns (uint256)
```

### equityOfAt

```solidity
function equityOfAt(address _account, uint256 _tokenId, uint256 _at) external view returns (uint256)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view returns (bool)
```

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _operator, address _from, address _to, uint256[] _tokenIds, uint256[] _amounts, bytes _data) internal
```

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address _operator, address _from, address _to, uint256[] _tokenIds, uint256[] _amounts, bytes _data) internal
```

