// SPDX-License-Identifier: MIT
// Authored by Plastic Digits
// Credit to Chainlink
pragma solidity ^0.8.4;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";
import "./libs/AmmLibrary.sol";
import "./interfaces/IAmmFactory.sol";
import "./interfaces/IAmmPair.sol";
import "./RabbitMinterv3.sol";

contract LuckyRabbitToken is
    ERC20PresetFixedSupply,
    VRFConsumerBaseV2,
    KeeperCompatibleInterface,
    AccessControlEnumerable,
    Ownable
{
    enum UPKEEP_TYPE {
        REQUEST_VRF,
        MINT
    }

    uint256 public constant MAX_ADDRESS_TICKETS = 200;

    VRFCoordinatorV2Interface COORDINATOR;
    LinkTokenInterface LINKTOKEN;

    // Your subscription ID.
    uint64 s_subscriptionId;

    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations
    bytes32 keyHash;

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
    // so 100,000 is a safe default for this example contract. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 callbackGasLimit = 50000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 3;
    uint256 randomWord;

    mapping(address => bool) public isExempt;

    uint256 public burnBPS = 1000;
    uint256 public tokensPerTicket = 1 ether;
    uint256 public czusdLockPerMint = 250 ether;
    uint256 public lastRabbitMintEpoch;
    uint256 public rabbitMintPeriod = 24 hours;
    uint256 public totalRabbitsMinted;

    address[][MAX_ADDRESS_TICKETS + 1] public ticketBuckets;
    mapping(address => bool) public addressHasWon;
    mapping(address => uint256) public addressTickets;
    mapping(address => uint256) public addressTicketBucketIndex;
    uint256 public totalTickets = 0;
    uint256 public baseCzusdLocked;

    bool isVrfPending;
    bool isRandomWordReady;

    RabbitMinterV3 public rabbitMinter;
    IAmmPair public ammCzusdPair;
    address public czusd;

    constructor(
        uint64 _subscriptionId,
        address _vrfCoordinator,
        address _link,
        bytes32 _gweiKeyHash,
        RabbitMinterV3 _rabbitMinter,
        IAmmFactory _factory,
        address _czusd,
        uint256 _baseCzusdLocked
    )
        VRFConsumerBaseV2(_vrfCoordinator)
        ERC20PresetFixedSupply("LuckyRabbit", "LRT", 10000 ether, msg.sender)
        Ownable()
    {
        keyHash = _gweiKeyHash;
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(_link);
        s_subscriptionId = _subscriptionId;
        rabbitMinter = _rabbitMinter;
        czusd = _czusd;
        baseCzusdLocked = _baseCzusdLocked;
        lastRabbitMintEpoch = block.timestamp;

        ammCzusdPair = IAmmPair(_factory.createPair(address(this), czusd));

        setHasWon(address(ammCzusdPair), true);
        setHasWon(msg.sender, true);
        setIsExempt(msg.sender, true);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        //Handle burn
        if (isExempt[sender] || isExempt[recipient]) {
            super._transfer(sender, recipient, amount);
        } else {
            uint256 burnAmount = (amount * burnBPS) / 10000;
            if (burnAmount > 0) super._burn(sender, burnAmount);
            super._transfer(sender, recipient, amount - burnAmount);
        }

        _updateAddressTickets(sender);
        _updateAddressTickets(recipient);
    }

    function _updateAddressTickets(address _for) internal {
        uint256 tickets = !addressHasWon[_for]
            ? balanceOf(_for) / tokensPerTicket
            : 0;
        if (tickets > MAX_ADDRESS_TICKETS) tickets = MAX_ADDRESS_TICKETS;
        uint256 prevTickets = addressTickets[_for];

        //If no change to tickets, then no processing required
        if (tickets == prevTickets) return;

        totalTickets = totalTickets + tickets - prevTickets;
        addressTickets[_for] = tickets;

        if (prevTickets != 0) {
            _deleteFromBucket(_for, prevTickets);
        }

        //Add the address to the bucket.
        ticketBuckets[tickets].push(_for);
    }

    function setIsExempt(address _for, bool _to) public onlyOwner {
        isExempt[_for] = _to;
    }

    function setBurnBPS(uint256 _to) public onlyOwner {
        require(_to < 30000); //max 30%
        burnBPS = _to;
    }

    function setTokensPerTicket(uint256 _to) public onlyOwner {
        tokensPerTicket = _to;
    }

    function setHasWon(address _for, bool _to) public onlyOwner {
        addressHasWon[_for] = _to;
    }

    function setBaseCzusdLocked(uint256 _to) public onlyOwner {
        baseCzusdLocked = _to;
    }

    function setCzusdLockPerMint(uint256 _to) public onlyOwner {
        czusdLockPerMint = _to;
    }

    function setRabbitMintPeriod(uint256 _to) public onlyOwner {
        rabbitMintPeriod = _to;
    }

    function rabbitsToMint() public view returns (uint256 rabbitMintCount_) {
        return
            ((_lockedCzusd() - baseCzusdLocked) / czusdLockPerMint) -
            totalRabbitsMinted;
    }

    function _lockedCzusd() internal view returns (uint256 lockedCzusd_) {
        bool czusdIsToken0 = ammCzusdPair.token0() == czusd;
        (uint112 reserve0, uint112 reserve1, ) = ammCzusdPair.getReserves();
        uint256 lockedLP = ammCzusdPair.balanceOf(address(this));
        uint256 totalLP = ammCzusdPair.totalSupply();

        uint256 lockedLpCzusdBal = ((czusdIsToken0 ? reserve0 : reserve1) *
            lockedLP) / totalLP;
        uint256 lockedLpLrtBal = ((czusdIsToken0 ? reserve1 : reserve0) *
            lockedLP) / totalLP;

        if (lockedLpLrtBal == totalSupply()) {
            lockedCzusd_ = lockedLpCzusdBal;
        } else {
            lockedCzusd_ =
                lockedLpCzusdBal -
                (
                    AmmLibrary.getAmountOut(
                        totalSupply() - lockedLpLrtBal,
                        lockedLpLrtBal,
                        lockedLpCzusdBal
                    )
                );
        }
    }

    function _deleteFromBucket(address _for, uint256 _prevTickets) internal {
        //Update bucket index and reorder bucket
        address[] storage bucket = ticketBuckets[_prevTickets];
        address toMove = bucket[bucket.length - 1];
        if (toMove != _for) {
            uint256 index = addressTicketBucketIndex[_for];
            addressTicketBucketIndex[toMove] = index;
            bucket[index] = toMove;
        }
        delete bucket[bucket.length - 1];
    }

    //VRF CHAINLINK
    function _requestRandomWords() internal {
        // Will revert if subscription is not set and funded.
        COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            1
        );
    }

    function fulfillRandomWords(uint256, uint256[] memory _randomWords)
        internal
        override
    {
        randomWord = _randomWords[0];
        isVrfPending = false;
        isRandomWordReady = true;
    }

    function getWinner(uint256 _word) public view returns (address winner_) {
        uint256 bucketRoll = 1 + (_word % totalTickets);
        uint256 winningBucketIndex = 0;
        uint256 accumulator;
        while (accumulator < bucketRoll) {
            winningBucketIndex++;
            accumulator += (ticketBuckets[winningBucketIndex].length *
                winningBucketIndex);
        }
        address[] storage bucket = ticketBuckets[winningBucketIndex];
        uint256 accountRoll = 1 + (_word % bucket.length);
        winner_ = bucket[accountRoll];
    }

    //KEEPER CHAINLINK
    function checkUpkeep(bytes calldata checkData)
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        UPKEEP_TYPE upkeepType = abi.decode(checkData, (UPKEEP_TYPE));
        performData = checkData;
        if (upkeepType == UPKEEP_TYPE.REQUEST_VRF) {
            upkeepNeeded = _isUpkeepAllowedRequestVrf();
        }
        if (upkeepType == UPKEEP_TYPE.MINT) {
            upkeepNeeded = _isUpkeepAllowedMint();
        }
    }

    function _isUpkeepAllowedRequestVrf() internal view returns (bool) {
        return
            rabbitsToMint() > 0 &&
            (block.timestamp > (rabbitMintPeriod + lastRabbitMintEpoch)) &&
            !isVrfPending &&
            !isRandomWordReady &&
            totalTickets > 0 &&
            rabbitMinter.canMint();
    }

    function _isUpkeepAllowedMint() internal view returns (bool) {
        return
            (rabbitsToMint() > 0) &&
            (block.timestamp > (rabbitMintPeriod + lastRabbitMintEpoch)) &&
            isRandomWordReady &&
            totalTickets > 0 &&
            rabbitMinter.canMint();
    }

    //WARNING: Be sure that performUpkeep cannot be exploited by non-keeper callers
    function performUpkeep(bytes calldata performData) external override {
        UPKEEP_TYPE upkeepType = abi.decode(performData, (UPKEEP_TYPE));
        if (upkeepType == UPKEEP_TYPE.REQUEST_VRF) {
            _performUpkeepRequestVrf();
        }
        if (upkeepType == UPKEEP_TYPE.MINT) {
            _performUpkeepMintRabbit();
        }
    }

    function _performUpkeepRequestVrf() internal {
        require(
            _isUpkeepAllowedRequestVrf(),
            "LRT: Request VRF Upkeep not allowed"
        );
        isVrfPending = true;
        _requestRandomWords();
    }

    function _performUpkeepMintRabbit() internal {
        require(_isUpkeepAllowedMint(), "LRT: Mint Upkeep not allowed");
        isRandomWordReady = false;
        lastRabbitMintEpoch = block.timestamp;
        totalRabbitsMinted++;

        address winner = getWinner(randomWord);

        _deleteFromBucket(winner, addressTickets[winner]);
        totalTickets -= addressTickets[winner];
        addressHasWon[winner] = true;
        addressTickets[winner] = 0;

        rabbitMinter.freeMint(winner);
    }
}
