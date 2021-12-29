// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./metatx/EIP712MetaTransaction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract RabTimer is AccessControlEnumerable, Ownable, EIP712MetaTransaction {
    bytes32 public constant TIMER_RESET_ROLE = keccak256("TIMER_RESET_ROLE");


    uint32 public startEpoch;
    uint32 public whitelistEndEpoch;
    uint32 public endEpoch;

    uint32 public countdownSeconds;

    constructor(uint32 _startEpoch, uint32 _whitelistEndEpoch, uint32 _countdownSeconds) EIP712MetaTransaction("@RabbitCatch/RabTimer","1.0.0") Ownable() {
        _setupRole(TIMER_RESET_ROLE, msgSender());
        setCountdownSeconds(_countdownSeconds);
        setEpochs(_startEpoch, _whitelistEndEpoch);
    }

    function setEpochs(uint32 _startEpoch, uint32 _whitelistEndEpoch) public onlyOwner {
        startEpoch = _startEpoch;
        whitelistEndEpoch = _whitelistEndEpoch;
        endEpoch = whitelistEndEpoch + countdownSeconds;
    }

    function setCountdownSeconds(uint32 _to) public onlyOwner {
        countdownSeconds = _to;
    }

    function timerReset() external onlyRole(TIMER_RESET_ROLE) {
        uint32 newEndEpoch = uint32(block.timestamp) + countdownSeconds;
        if(newEndEpoch > endEpoch) endEpoch = newEndEpoch;
    }


}