// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// Fixes bugs in release version of LRT
pragma solidity ^0.8.4;

//import "hardhat/console.sol";

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/IterableArrayWithoutDuplicateKeys.sol";
import "./RabbitMinterv3.sol";
import "./LuckyRabbitToken.sol";

contract LRTPatch is VRFConsumerBaseV2, KeeperCompatibleInterface, Ownable {
    using IterableArrayWithoutDuplicateKeys for IterableArrayWithoutDuplicateKeys.Map;
    enum UPKEEP_TYPE {
        REQUEST_VRF,
        MINT
    }
    //VRF properties
    VRFCoordinatorV2Interface COORDINATOR;
    LinkTokenInterface LINKTOKEN;
    uint64 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 50000;
    uint16 requestConfirmations = 3;
    uint256 public randomWord;
    uint256 public vrfRequestId;
    //Ticket properties
    uint256 public constant MAX_ADDRESS_TICKETS = 200;
    IterableArrayWithoutDuplicateKeys.Map[MAX_ADDRESS_TICKETS +
        1] ticketBuckets;
    mapping(address => bool) public addressHasWon; //ALSO: set to true for addresses which are not eligible to win.
    mapping(address => uint256) public addressTickets;
    uint256 public totalTickets = 0;
    //Mint properties
    uint256 public lastRabbitMintEpoch;
    uint256 public totalRabbitsMinted;
    RabbitMinterV3 public rabbitMinter;
    LuckyRabbitToken public luckyRabbitToken;
    //State
    bool public state_isVrfPending;
    bool public state_isRandomWordReady;

    //Tracking
    IterableArrayWithoutDuplicateKeys.Map trackedAddresses;

    constructor(
        uint64 _subscriptionId,
        address _vrfCoordinator,
        address _link,
        bytes32 _gweiKeyHash,
        RabbitMinterV3 _rabbitMinter,
        LuckyRabbitToken _luckyRabbitToken
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable() {
        keyHash = _gweiKeyHash;
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(_link);
        s_subscriptionId = _subscriptionId;
        setRabbitMinter(_rabbitMinter);
        setLuckyRabbitToken(_luckyRabbitToken);

        setLastRabbitMintEpoch(luckyRabbitToken.lastRabbitMintEpoch());
        setTotalRabbitsMinted(luckyRabbitToken.totalRabbitsMinted());

        setHasWon(address(luckyRabbitToken.ammCzusdPair()), true);
        setHasWon(0xd6DE82E23BbCF0411380FD6ac070b5A35c987051, true); //lrt/bnb pair
        setHasWon(address(luckyRabbitToken), true);
        setHasWon(address(this), true);
        setHasWon(address(0xdead), true);
        setHasWon(address(0), true);
        setHasWon(owner(), true);
        setHasWon(0x9C9513E1b6F6F73D98F1FD99C3a5C2d7e81a3dd9, true); //rabbit winner
    }

    function setHasWon(address _for, bool _to) public onlyOwner {
        addressHasWon[_for] = _to;
    }

    function setLastRabbitMintEpoch(uint256 _to) public onlyOwner {
        lastRabbitMintEpoch = _to;
    }

    function setTotalRabbitsMinted(uint256 _to) public onlyOwner {
        totalRabbitsMinted = _to;
    }

    function trackAddresses(address[] memory _toTrack) public onlyOwner {
        for (uint256 i; i < _toTrack.length; i++) {
            trackedAddresses.add(_toTrack[i]);
        }
    }

    function untrackAddresses(address[] memory _toUntrack) public onlyOwner {
        for (uint256 i; i < _toUntrack.length; i++) {
            trackedAddresses.remove(_toUntrack[i]);
        }
    }

    function updateAccounts(uint256 _start, uint256 _count) public onlyOwner {
        _updateAccounts(_start, _count);
    }

    function setRabbitMinter(RabbitMinterV3 _to) public onlyOwner {
        rabbitMinter = _to;
    }

    function setLuckyRabbitToken(LuckyRabbitToken _to) public onlyOwner {
        luckyRabbitToken = _to;
    }

    function getAddressTickets(address _for) public view returns (uint256) {
        return addressTickets[_for];
    }

    function getAddressTicketBucketIndex(address _for)
        public
        view
        returns (int256)
    {
        return ticketBuckets[addressTickets[_for]].getIndexOfKey(_for);
    }

    function getTicketBucketSize(uint256 _tickets)
        public
        view
        returns (uint256)
    {
        return ticketBuckets[_tickets].size();
    }

    function getAddressAt(uint256 _tickets, uint256 _index)
        public
        view
        returns (address)
    {
        return ticketBuckets[_tickets].getKeyAtIndex(_index);
    }

    function getTrackedAddressAt(uint256 _index) public view returns (address) {
        return trackedAddresses.getKeyAtIndex(_index);
    }

    function getTrackedAddressIndex(address _for) public view returns (int256) {
        return trackedAddresses.getIndexOfKey(_for);
    }

    function getTrackedAddressCount() public view returns (uint256) {
        return trackedAddresses.size();
    }

    function rabbitsToMint() public view returns (uint256 rabbitMintCount_) {
        return
            ((luckyRabbitToken.lockedCzusd() -
                luckyRabbitToken.baseCzusdLocked()) /
                luckyRabbitToken.czusdLockPerMint()) - totalRabbitsMinted;
    }

    function fulfillRandomWords(uint256, uint256[] memory _randomWords)
        internal
        override
    {
        randomWord = _randomWords[0];
        state_isVrfPending = false;
        state_isRandomWordReady = true;
    }

    function _requestRandomWords() internal {
        // Will revert if subscription is not set and funded.
        vrfRequestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            1
        );
    }

    function getWinner(uint256 _word) public view returns (address winner_) {
        uint256 bucketRoll = 1 + (_word % totalTickets);
        uint256 winningBucketIndex = 0;
        uint256 accumulator;
        while (accumulator < bucketRoll) {
            winningBucketIndex++;
            accumulator += ((ticketBuckets[winningBucketIndex].size()) *
                winningBucketIndex);
        }
        IterableArrayWithoutDuplicateKeys.Map storage bucket = ticketBuckets[
            winningBucketIndex
        ];
        uint256 accountRoll = _word % bucket.size();
        winner_ = bucket.getKeyAtIndex(accountRoll);
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
            (block.timestamp >
                (luckyRabbitToken.rabbitMintPeriod() + lastRabbitMintEpoch)) &&
            !state_isVrfPending &&
            !state_isRandomWordReady &&
            totalTickets > 0 &&
            rabbitMinter.canMint();
    }

    function _isUpkeepAllowedMint() internal view returns (bool) {
        return
            (rabbitsToMint() > 0) &&
            (block.timestamp >
                (luckyRabbitToken.rabbitMintPeriod() + lastRabbitMintEpoch)) &&
            state_isRandomWordReady &&
            totalTickets > 0 &&
            rabbitMinter.canMint();
    }

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
        state_isVrfPending = true;
        _requestRandomWords();
        _updateAccounts(0, trackedAddresses.size());
    }

    function _performUpkeepMintRabbit() internal {
        require(_isUpkeepAllowedMint(), "LRT: Mint Upkeep not allowed");
        state_isRandomWordReady = false;
        lastRabbitMintEpoch = block.timestamp;
        totalRabbitsMinted++;

        address winner = getWinner(randomWord);

        _deleteAccount(winner, addressTickets[winner]);

        rabbitMinter.freeMint(winner);
    }

    function _deleteAccount(address _account, uint256 _prevTickets) internal {
        //console.log("Deleting", _account, _prevTickets);
        //Update bucket index and reorder bucket
        totalTickets -= _prevTickets;
        trackedAddresses.remove(_account);
        addressTickets[_account] = 0;
        ticketBuckets[_prevTickets].remove(_account);
    }

    function _updateAccounts(uint256 _start, uint256 _count) internal {
        for (uint256 i = _start + _count; i > 0; i--) {
            //Go in reverse since update might delete it
            _updateAccount(trackedAddresses.getKeyAtIndex(i - 1));
        }
    }

    function _updateAccount(address _account) internal {
        uint256 previousTickets = addressTickets[_account];
        uint256 currentTickets = 0;
        if (!addressHasWon[_account]) {
            uint256 ticketBal = luckyRabbitToken.balanceOf(_account) /
                luckyRabbitToken.tokensPerTicket();
            currentTickets = ticketBal > MAX_ADDRESS_TICKETS
                ? MAX_ADDRESS_TICKETS
                : ticketBal;
        }
        //console.log("Updating", _account, previousTickets, currentTickets);
        if (previousTickets != currentTickets) {
            if (currentTickets == 0) {
                //Account is no longer playing
                _deleteAccount(_account, previousTickets);
            } else if (previousTickets == 0) {
                //New account
                ticketBuckets[currentTickets].add(_account);
                addressTickets[_account] = currentTickets;
                totalTickets += currentTickets;
            } else {
                //Account is active but has a different amount of tickets.
                ticketBuckets[previousTickets].remove(_account);
                ticketBuckets[currentTickets].add(_account);
                addressTickets[_account] = currentTickets;
                totalTickets = totalTickets + currentTickets - previousTickets;
            }
        } else if (currentTickets == 0) {
            //no longer need to track this address - no change and 0 tickets
            trackedAddresses.remove(_account);
        }
    }
}
