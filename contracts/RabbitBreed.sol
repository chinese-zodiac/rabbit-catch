// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./metatx/EIP712MetaTransaction.sol";
import "./RabbitRocket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

contract RabbitBreed is Ownable, EIP712MetaTransaction, PullPayment {

    RabbitRocket rabbitRocket;

    constructor(RabbitRocket _rabbitRocket) EIP712MetaTransaction("@RabbitCatch/RabbitBreed","1.0.0") Ownable() {
        rabbitRocket = _rabbitRocket;
    }

    function addToRewards() external payable {}

    function sendRewards(address _first, address _second, address _third) external onlyOwner {
        require(rabbitRocket.isOver(),"RabbitGreed: RabbitRocket Is Not Over");
        _asyncTransfer(_first, address(this).balance / 2);
        _asyncTransfer(_second, address(this).balance / 2);
        _asyncTransfer(_third, address(this).balance);
    }


}