// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./czodiac/CZodiacNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract RabbitMinterV2 is Ownable {
    using Address for address payable;
    string public constant baseURI =
        "ipfs://QmZmF4aTdKtRzFj5pZu9MvAspDic9Z6T11ymofnAiV7Gsv/";

    CZodiacNFT public constant czodiacNFT = CZodiacNFT(0x6Bf5843b39EB6D5d7ee38c0b789CcdE42FE396b4);
    uint256 public priceStart = 0.1 ether;
    uint256 public priceIncrement = 0.1 ether;
    uint256 public constant mintCountPriceIncrement = 100;
    uint256 public constant mintCountMax = 2500;
    uint256 public mintCount = 331;

    constructor() Ownable() {}

    function getPrice() public view returns (uint256 _price) {
        return
            priceStart +
            (priceIncrement) *
            (mintCount / mintCountPriceIncrement);
    }

    function canMint() public view returns (bool _canMint) {
        return mintCount < mintCountMax;
    }

    function mint(address _for)
        external
        payable
    {
        require(canMint(), "RabbitMinterV2: Cannot Mint");
        require(
            msg.value == getPrice(),
            "RabbitMinterV2: Invalid BNB Value"
        );
        czodiacNFT.mint(
            string(
                abi.encodePacked(
                    baseURI,
                    Strings.toString(mintCount + 1),
                    ".json"
                )
            ),
            3
        );
        czodiacNFT.safeTransferFrom(
            address(this),
            _for,
            czodiacNFT.totalSupply() - 1
        );
        mintCount++;
        payable(owner()).sendValue(address(this).balance);
    }

    function setPriceIncrement(uint256 _to) onlyOwner external{
        priceIncrement = _to;
    }

    function setPriceStart(uint256 _to) onlyOwner external{
        priceStart = _to;
    }
}