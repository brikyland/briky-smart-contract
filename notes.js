signer = (await ethers.getSigners())[0]

Admin = await ethers.getContractFactory('Admin')
admin = await Admin.attach(network.config.adminAddress).connect(signer)

CommissionToken = await ethers.getContractFactory('CommissionToken')
EstateMarketPlace = await ethers.getContractFactory('EstateMarketplace')

PrimaryToken = await ethers.getContractFactory('PrimaryToken')
primaryToken = await PrimaryToken.attach(network.config.primaryTokenAddress).connect(signer)

EstateToken = await ethers.getContractFactory('EstateToken')
estateToken = await EstateToken.attach(network.config.estateTokenAddress).connect(signer)

EstateForger = await ethers.getContractFactory('EstateForger')
estateForger = await EstateForger.attach(network.config.estateForgerAddress).connect(signer)

Driptributor = await ethers.getContractFactory('Driptributor')
driptributor = await Driptributor.attach(network.config.driptributorAddress).connect(signer)

nonce = await admin.nonce()

message = ethers.utils.defaultAbiCoder.encode([
    'address', 'string',
    'uint256',
    'uint256',
], [
    estateForger.address, 'updateBaseUnitPriceRange',
    ethers.utils.parseEther('100'),
    ethers.utils.parseEther('1000'),
])

// messageUpdatePriceFeeds = ethers.utils.defaultAbiCoder.encode([
//     'address', 'string',
//     'address[]',
//     'address[]',
//     'uint40[]',
// ], [
//     estateForger.address, 'updatePriceFeeds',
//     currencyWithFeeds,
//     feeds,
//     [3600, 3600, 3600, 3600, 3600],
// ])

messageHash = ethers.utils.solidityKeccak256(['bytes', 'uint256'], [message, nonce])

signature = await signer.signMessage(ethers.utils.arrayify(messageHash))
signatures = Array(5).fill(signature)

await estateForger.updateBaseUnitPriceRange(
    ethers.utils.parseEther('100'),
    ethers.utils.parseEther('1000'),
    signatures,
)


nowInSeconds = Math.floor(Date.now() / 1000);

accountAddresses = [
    '0x0C6D9B72c9Cd5A7815cc6C74d21BEe0b7b264603',
    '0x33411e916Bfc093163eA148C26e5e359c5ceC1Fa',
    '0xc65cEa68Ca3165A2e396f6A50bdc300Ca742dE19',
    '0x8740772cC2D3aCF81c916422b35dB0767655ccd0',
    '0x9258D901A9be5f825E65cDe13E109D30E74E2eF8',
    '0x869cCd78F7e64189EEA2bDe1DcC4466bdE046D4B',
    '0xABA30eCBF177cF4215a59d94A04eEB9434A85b06',
    '0x567847c538e915dA44dad565175494CEDd049001',
    '0xF3cA86f8d803726642E165D843466D563c1648c1',
    '0x7DCC454E116899e900a961eCb3e19F4f7759497A',
    '0xc02bf1aE0556b97f3E03fA55D69EF5E2731D7f26',
]

managerAddresses = [
    '0x0C6D9B72c9Cd5A7815cc6C74d21BEe0b7b264603',
    '0x33411e916Bfc093163eA148C26e5e359c5ceC1Fa',
    '0xc65cEa68Ca3165A2e396f6A50bdc300Ca742dE19', 
]

moderatorAddresses = [
    '0x8740772cC2D3aCF81c916422b35dB0767655ccd0',
    '0x9258D901A9be5f825E65cDe13E109D30E74E2eF8',
    '0x869cCd78F7e64189EEA2bDe1DcC4466bdE046D4B', 
]

userAddresses = [
    '0xABA30eCBF177cF4215a59d94A04eEB9434A85b06',
    '0x567847c538e915dA44dad565175494CEDd049001',
    '0xF3cA86f8d803726642E165D843466D563c1648c1',
    '0x7DCC454E116899e900a961eCb3e19F4f7759497A',
]

zone = ethers.utils.formatBytes32String('Vietnam')
await admin.isActiveIn(zone, managerAddresses[0])
await admin.isActiveIn(zone, managerAddresses[1])
await admin.isActiveIn(zone, moderatorAddresses[0])
await admin.isActiveIn(zone, moderatorAddresses[1])
await admin.isActiveIn(zone, moderatorAddresses[2])

adminCurrencyRegistries = [
    {
        'address': network.config.primaryTokenAddress,
        'isAvailable': true,
        'isExclusive': true,
    }
    ,
    {
        'address': network.config.stakeToken1Address,
        'isAvailable': true,
        'isExclusive': true,
    },
    {
        'address': network.config.stakeToken2Address,
        'isAvailable': true,
        'isExclusive': true,
    },
    {
        'address': network.config.stakeToken3Address,
        'isAvailable': true,
        'isExclusive': true,
    },
    {
        'address': '0x0000000000000000000000000000000000000000',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0x52119aFB9d3191260A7deE3155710A08b9060eDb',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0xE5C25896d71B28c6B184421d09a9C5720796Cb89',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0xde40BedB8F55d41FA91600bAA9F4354FEd33A859',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0x659629e4714BEb61B2A6759D14229607b72d416A',
        'isAvailable': true,
        'isExclusive': false,
    }
]


const requesterAddress = '0xc02bf1aE0556b97f3E03fA55D69EF5E2731D7f26'
const zone = ethers.utils.formatBytes32String('Vietnam')
const uri = 'https://ipfs.brikyland.com/ipfs/bafkreifnffeyqjekgl2htptwqrnllbja2gmjwup5jbhiodsqp5ucw4fvcq'
const totalSupply = BigInt(10000000000000000000000)
const minSellingAmount = BigInt(5000000000000000000000)
const maxSellingAmount = BigInt(10000000000000000000000)
const unitPrice = BigInt(100000000000000000000)
const currency = "0x52119aFB9d3191260A7deE3155710A08b9060eDb"
const decimals = Number(18)
const expireAt = 1099511627775
const duration = 864000


// Price feeds
nativeCurrencies = [
    network.config.primaryTokenAddress,
    network.config.stakeToken1Address,
    network.config.stakeToken2Address,
    network.config.stakeToken3Address,
]
currencyWithFeeds = [
    '0x0000000000000000000000000000000000000000',
    '0x886eccaabF18A070e3b861baB5311eee9373dAb1',
    '0x77F3801d2ca1c54002f2a430709040F1cDF2BCD4',
    '0x551a54Ec8d3159a921A98455D122810ED0533d62',
    '0xbb0b5Fc813a972614a82144B8B143A3C9579875D',
]
feeds = [
    '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    '0xEca2605f0BCF2BA5966372C99837b1F182d3D620',
    '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
    '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
    '0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa',
]

estateForgerEvents = [
    'BaseUnitPriceRangeUpdate',
    'DefaultRateUpdate',
    'PriceFeedUpdate',
    'NewRequest',
    'RequestCancellation',
    'RequestConfirmation',
    'RequestUpdate',
    'RequestURIUpdate',
    'Deposit',
    'DepositWithdrawal',
    'TokenWithdrawal',
    'UnitPriceValidation',
]

estateForgerEvents.map(event => [event, EstateForger.interface.getEventTopic(event)])

estateTokenEvents = [
    'BaseURIUpdate',
    'NewToken',
    'EstateDeprecation',
    'EstateExpirationExtension',
]
estateTokenEvents.map(event => [event, EstateToken.interface.getEventTopic(event)])

driptributorEvents = [
    'NewDistribution',
    'Stake',
    'Withdrawal',
]
driptributorEvents.map(event => [event, Driptributor.interface.getEventTopic(event)])

async function invokeFunction(contractInstance, functionName, args) {
    signer = (await ethers.getSigners())[0]
    Admin = await ethers.getContractFactory('Admin')
    admin = await Admin.attach(network.config.adminAddress).connect(signer)

    fragment = contractInstance.interface.getFunction(functionName)
    inputTypes = fragment.inputs.map(input => input.type)
    data = [
        [
            'address', 'string',
            ...inputTypes.slice(0, -1)
        ],
        [
            contractInstance.address, functionName,
            ...args
        ]
    ]
    console.log(data)
    message = ethers.utils.defaultAbiCoder.encode(...data)

    nonce = await admin.nonce()
    console.log('Nonce: ', nonce)
    messageHash = ethers.utils.solidityKeccak256(['bytes', 'uint256'], [message, nonce])
    signature = await signer.signMessage(ethers.utils.arrayify(messageHash))
    console.log('Signature: ', signature)
    signatures = Array(5).fill(signature)

    invocationArgs = [...args, signatures]
    console.log('Invocation args: ', invocationArgs)
    return await contractInstance.connect(signer)[functionName](...invocationArgs)
}

// -----------------------------------------------------------------------------
Admin = await ethers.getContractFactory('Admin')
admin = await Admin.attach(network.config.adminAddress).connect(signer)
zone = ethers.utils.formatBytes32String('Vietnam')
tx = await invokeFunction(admin, 'declareZones', [[zone], true])
tx = await invokeFunction(admin, 'declareZones', [[zone], false])
// -----------------------------------------------------------------------------
managerAddresses = [
    '0x0C6D9B72c9Cd5A7815cc6C74d21BEe0b7b264603',
    '0x33411e916Bfc093163eA148C26e5e359c5ceC1Fa',
    '0xc65cEa68Ca3165A2e396f6A50bdc300Ca742dE19', 
]
tx = await invokeFunction(admin, 'authorizeManagers', [managerAddresses, true])

moderatorAddresses = [
    '0x8740772cC2D3aCF81c916422b35dB0767655ccd0',
    '0x9258D901A9be5f825E65cDe13E109D30E74E2eF8',
    '0x869cCd78F7e64189EEA2bDe1DcC4466bdE046D4B', 
]
tx = await invokeFunction(admin, 'authorizeModerators', [moderatorAddresses, true])

tx = await invokeFunction(admin, 'activateIn', [zone, [...managerAddresses, ...moderatorAddresses, signer.address], true])
// -----------------------------------------------------------------------------
userAddresses = [
    '0xABA30eCBF177cF4215a59d94A04eEB9434A85b06',
    '0x567847c538e915dA44dad565175494CEDd049001',
    '0xF3cA86f8d803726642E165D843466D563c1648c1',
    '0x7DCC454E116899e900a961eCb3e19F4f7759497A',
]
tx = await invokeFunction(admin, 'authorizeManagers', [userAddresses, true])
tx = await invokeFunction(admin, 'authorizeManagers', [userAddresses, false])

tx = await invokeFunction(admin, 'authorizeModerators', [userAddresses, true])
tx = await invokeFunction(admin, 'authorizeModerators', [userAddresses, false])

tx = await invokeFunction(admin, 'activateIn', [zone, userAddresses, true])
tx = await invokeFunction(admin, 'activateIn', [zone, userAddresses, false])
// -----------------------------------------------------------------------------
adminCurrencyRegistries = [
    {
        'address': network.config.primaryTokenAddress,
        'isAvailable': true,
        'isExclusive': true,
    }
    ,
    {
        'address': network.config.stakeToken1Address,
        'isAvailable': true,
        'isExclusive': true,
    },
    {
        'address': network.config.stakeToken2Address,
        'isAvailable': true,
        'isExclusive': true,
    },
    {
        'address': network.config.stakeToken3Address,
        'isAvailable': true,
        'isExclusive': true,
    },
    {
        'address': '0x0000000000000000000000000000000000000000',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0x886eccaabF18A070e3b861baB5311eee9373dAb1',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0x77F3801d2ca1c54002f2a430709040F1cDF2BCD4',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0x551a54Ec8d3159a921A98455D122810ED0533d62',
        'isAvailable': true,
        'isExclusive': false,
    },
    {
        'address': '0xbb0b5Fc813a972614a82144B8B143A3C9579875D',
        'isAvailable': true,
        'isExclusive': false,
    }
]
tx = await invokeFunction(admin, 'updateCurrencyRegistries', [
    adminCurrencyRegistries.map(currencyRegistry => currencyRegistry['address']),
    adminCurrencyRegistries.map(currencyRegistry => currencyRegistry['isAvailable']),
    adminCurrencyRegistries.map(currencyRegistry => currencyRegistry['isExclusive']),
])

// -----------------------------------------------------------------------------
PrimaryToken = await ethers.getContractFactory('PrimaryToken')
primaryToken = await PrimaryToken.attach(network.config.primaryTokenAddress).connect(signer)
tx = await invokeFunction(primaryToken, 'updateTreasury', [network.config.treasuryAddress])
tx = await invokeFunction(primaryToken, 'updateStakeToken1', [network.config.stakeToken1Address])
tx = await invokeFunction(primaryToken, 'updateStakeToken2', [network.config.stakeToken2Address])
tx = await invokeFunction(primaryToken, 'updateStakeToken3', [network.config.stakeToken3Address])
tx = await invokeFunction(primaryToken, 'unlockForSeedRound', [network.config.seedRoundDistributorAddress])
tx = await invokeFunction(primaryToken, 'unlockForPrivateSale1', [network.config.privateSale1DistributorAddress])
tx = await invokeFunction(primaryToken, 'unlockForPrivateSale2', [network.config.privateSale2DistributorAddress])
tx = await invokeFunction(primaryToken, 'unlockForCoreTeam', [network.config.coreTeamDistributorAddress])
// -----------------------------------------------------------------------------
StakeToken = await ethers.getContractFactory('StakeToken')
stakeToken1 = await StakeToken.attach(network.config.stakeToken1Address)
stakeToken2 = await StakeToken.attach(network.config.stakeToken2Address)
stakeToken3 = await StakeToken.attach(network.config.stakeToken3Address)

initialLastRewardFetch = 1748273633
tx = await invokeFunction(stakeToken1, 'initializeRewarding', [initialLastRewardFetch, network.config.stakeToken2Address])
tx = await invokeFunction(stakeToken2, 'initializeRewarding', [initialLastRewardFetch, network.config.stakeToken3Address])
tx = await invokeFunction(stakeToken3, 'initializeRewarding', [initialLastRewardFetch, '0x0000000000000000000000000000000000000000'])
// -----------------------------------------------------------------------------
accountAddresses = [
    '0x0C6D9B72c9Cd5A7815cc6C74d21BEe0b7b264603',
    '0x33411e916Bfc093163eA148C26e5e359c5ceC1Fa',
    '0xc65cEa68Ca3165A2e396f6A50bdc300Ca742dE19',
    '0x8740772cC2D3aCF81c916422b35dB0767655ccd0',
    '0x9258D901A9be5f825E65cDe13E109D30E74E2eF8',
    '0x869cCd78F7e64189EEA2bDe1DcC4466bdE046D4B',
    '0xABA30eCBF177cF4215a59d94A04eEB9434A85b06',
    '0x567847c538e915dA44dad565175494CEDd049001',
    '0xF3cA86f8d803726642E165D843466D563c1648c1',
    '0x7DCC454E116899e900a961eCb3e19F4f7759497A',
    '0xc02bf1aE0556b97f3E03fA55D69EF5E2731D7f26',
]
roundAmounts = [
    1*60*24*1,
    2*60*24*2,
    3*60*24*3,
    4*60*24*4,
    5*60*24*5,
    6*60*24*6,
    7*60*24*7,
    8*60*24*8,
    9*60*24*9,
    10*60*24*10,
    11*60*24*11,
]
roundAmounts = roundAmounts.map(amount => ethers.utils.parseEther(amount.toString()))

roundVestingDurations = [
    60 * 60 * 24 * 1,
    60 * 60 * 24 * 2,
    60 * 60 * 24 * 3,
    60 * 60 * 24 * 4,
    60 * 60 * 24 * 5,
    60 * 60 * 24 * 6,
    60 * 60 * 24 * 7,
    60 * 60 * 24 * 8,
    60 * 60 * 24 * 9,
    60 * 60 * 24 * 10,
    60 * 60 * 24 * 11,
]

roundData = [
    '1 token each minute for 1 day',
    '2 token each minute for 2 days',
    '3 token each minute for 3 days',
    '4 token each minute for 4 days',
    '5 token each minute for 5 days',
    '6 token each minute for 6 days',
    '7 token each minute for 7 days',
    '8 token each minute for 8 days',
    '9 token each minute for 9 days',
    '10 token each minute for 10 days',
    '11 token each minute for 11 days',
]

Driptributor = await ethers.getContractFactory('Driptributor')
seedRoundDistributor = await Driptributor.attach(network.config.seedRoundDistributorAddress)
privateSale1Distributor = await Driptributor.attach(network.config.privateSale1DistributorAddress)
privateSale2Distributor = await Driptributor.attach(network.config.privateSale2DistributorAddress)
coreTeamDistributor = await Driptributor.attach(network.config.coreTeamDistributorAddress)

await invokeFunction(seedRoundDistributor, 'distributeTokensWithDuration', [
    accountAddresses,
    roundAmounts,
    roundVestingDurations,
    roundData,
])
await invokeFunction(privateSale1Distributor, 'distributeTokensWithDuration', [
    accountAddresses,
    roundAmounts,
    roundVestingDurations,
    roundData,
])
await invokeFunction(privateSale2Distributor, 'distributeTokensWithDuration', [
    accountAddresses,
    roundAmounts,
    roundVestingDurations,
    roundData,
])
await invokeFunction(coreTeamDistributor, 'distributeTokensWithDuration', [
    accountAddresses,
    roundAmounts,
    roundVestingDurations,
    roundData,
])
// -----------------------------------------------------------------------------
EstateToken = await ethers.getContractFactory('EstateToken')
estateToken = await EstateToken.attach(network.config.estateTokenAddress).connect(signer)

await invokeFunction(estateToken, 'updateCommissionToken', [network.config.commissionTokenAddress])
await invokeFunction(estateToken, 'authorizeTokenizers', [[network.config.estateForgerAddress], true])
// -----------------------------------------------------------------------------
currencyWithFeeds = [
    '0x0000000000000000000000000000000000000000',
    '0x886eccaabF18A070e3b861baB5311eee9373dAb1',
    '0x77F3801d2ca1c54002f2a430709040F1cDF2BCD4',
    '0x551a54Ec8d3159a921A98455D122810ED0533d62',
    '0xbb0b5Fc813a972614a82144B8B143A3C9579875D',
]
feeds = [
    '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    '0xEca2605f0BCF2BA5966372C99837b1F182d3D620',
    '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
    '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
    '0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa',
]
heartbeats = [
    60*60*24,
    60*60*24,
    60*60*24,
    60*60*24,
    60*60*24,
]
EstateForger = await ethers.getContractFactory('EstateForger')
estateForger = await EstateForger.attach(network.config.estateForgerAddress).connect(signer)
await invokeFunction(estateForger, 'updatePriceFeeds', [
    currencyWithFeeds,
    feeds,
    heartbeats,
])

// -----------------------------------------------------------------------------
requesterAddress = '0xc02bf1aE0556b97f3E03fA55D69EF5E2731D7f26'
zone = ethers.utils.formatBytes32String('Vietnam')
uri = "https://ipfs.brikyland.com/ipfs/bafkreicqtyg2gf6ebufegyij3d77ykpah3sxs5ojv5twsnvvedqzdya25m"
totalSupply = 10000
minSellingAmount = 5000
maxSellingAmount = 10000
unitPrice = ethers.utils.parseEther('500')
currency = network.config.liquidationCurrencyAddress
decimals = Number(18)
expireAt = 1099511627775
duration = 864000

tx = await estateForger.requestTokenization(
    requesterAddress,
    zone,
    uri,
    totalSupply,
    minSellingAmount,
    maxSellingAmount,
    unitPrice,
    currency,
    decimals,
    expireAt,
    duration
);

// ----------------------------------------------------------------------
Currency = await ethers.getContractFactory('Currency')
liquidationCurrency = await Currency.attach(network.config.liquidationCurrencyAddress)
mockedCurrencies = [
    '0x77F3801d2ca1c54002f2a430709040F1cDF2BCD4',
    '0x551a54Ec8d3159a921A98455D122810ED0533d62',
    '0xbb0b5Fc813a972614a82144B8B143A3C9579875D',
]
currency1 = await Currency.attach(mockedCurrencies[0])
currency2 = await Currency.attach(mockedCurrencies[1])
currency3 = await Currency.attach(mockedCurrencies[2])

async function mintCurrency(currency, amount, accounts) {
    for (let i = 0; i < accounts.length; i++) {
        tx = await currency.mint(accounts[i], ethers.utils.parseEther(amount.toString()))
        console.log(tx)
    }
}



key = zone
slotIndex = 10
storageSlot1 = ethers.utils.solidityKeccak256(
  ['bytes32','uint256'],
  [key, slotIndex]
);
value = await ethers.provider.getStorageAt(contract.address, storageSlot);