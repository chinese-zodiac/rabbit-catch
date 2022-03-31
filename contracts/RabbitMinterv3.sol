// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
pragma solidity ^0.8.4;

import "./czodiac/CZodiacNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract RabbitMinterV3 is Ownable, AccessControlEnumerable {
    using Address for address payable;
    string public constant baseURI =
        "ipfs://QmZmF4aTdKtRzFj5pZu9MvAspDic9Z6T11ymofnAiV7Gsv/";
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    CZodiacNFT public constant czodiacNFT =
        CZodiacNFT(0x6Bf5843b39EB6D5d7ee38c0b789CcdE42FE396b4);
    uint256 public priceStart = 0.1 ether;
    uint256 public priceIncrement = 0.1 ether;
    uint256 public constant mintCountPriceIncrement = 100;
    uint256 public constant mintCountMax = 2500;
    uint256 public mintCount = 333;

    constructor() Ownable() {
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function getPrice() public view returns (uint256 _price) {
        return
            priceStart +
            (priceIncrement) *
            (mintCount / mintCountPriceIncrement);
    }

    function canMint() public view returns (bool _canMint) {
        return mintCount < mintCountMax;
    }

    function mint(address _for) external payable {
        require(msg.value == getPrice(), "RabbitMinterV2: Invalid BNB Value");
        _mint(_for);
        payable(owner()).sendValue(address(this).balance);
    }

    function freeMint(address _for) external onlyRole(MINTER_ROLE) {
        _mint(_for);
    }

    function _mint(address _for) internal {
        require(canMint(), "RabbitMinterV2: Cannot Mint");
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
    }

    function setPriceIncrement(uint256 _to) external onlyOwner {
        priceIncrement = _to;
    }

    function setPriceStart(uint256 _to) external onlyOwner {
        priceStart = _to;
    }
}
