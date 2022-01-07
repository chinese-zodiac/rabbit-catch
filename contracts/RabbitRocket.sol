// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./metatx/EIP712MetaTransaction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

contract RabbitRocket is
    AccessControlEnumerable,
    Ownable,
    EIP712MetaTransaction,
    PullPayment
{
    bytes32 public constant MASTER_ROLE = keccak256("MASTER_ROLE");

    uint32 public startEpoch;
    uint32 public whitelistEndEpoch;
    uint32 public endEpoch;

    uint32 public countdownSeconds;

    bool public endGameOverride;

    address public lastBuyer;

    constructor(
        uint32 _startEpoch,
        uint32 _whitelistEndEpoch,
        uint32 _countdownSeconds
    ) EIP712MetaTransaction("@RabbitCatch/RabbitRocket", "1.0.0") Ownable() {
        _setupRole(MASTER_ROLE, msgSender());
        setCountdownSeconds(_countdownSeconds);
        setEpochs(_startEpoch, _whitelistEndEpoch);
    }

    function setEpochs(uint32 _startEpoch, uint32 _whitelistEndEpoch)
        public
        onlyOwner
    {
        startEpoch = _startEpoch;
        whitelistEndEpoch = _whitelistEndEpoch;
        endEpoch = whitelistEndEpoch + countdownSeconds;
    }

    function setCountdownSeconds(uint32 _to) public onlyOwner {
        countdownSeconds = _to;
    }

    function isOver() public view returns (bool isOver_) {
        if (endGameOverride) return true;
        return endEpoch < block.timestamp;
    }

    function isStarted() public view returns (bool isOver_) {
        return startEpoch < block.timestamp;
    }

    function timerReset(address _buyer) external payable onlyRole(MASTER_ROLE) {
        require(!isOver(), "RabbitRocket: Is Over");
        lastBuyer = _buyer;
        uint32 newEndEpoch = uint32(block.timestamp) + countdownSeconds;
        if (newEndEpoch > endEpoch) endEpoch = newEndEpoch;
    }

    function endGameNow(address _winner) external onlyRole(MASTER_ROLE) {
        require(!isOver(), "RabbitRocket: Is Over");
        endGameOverride = true;
        lastBuyer = _winner;
    }

    function sendRewards() external {
        require(isOver(), "RabbitRocket: Is Not Over");
        _asyncTransfer(lastBuyer, address(this).balance);
    }
}
