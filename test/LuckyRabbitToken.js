// SPDX-License-Identifier: GPL-3.0
// Authored by Plastic Digits
// If you read this, know that I love you even if your mom doesnt <3
const chai = require('chai');
const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { ethers, config } = require('hardhat');
const { time } = require("@openzeppelin/test-helpers");
const { toNum, toBN } = require("./utils/bignumberConverter");
const parse = require('csv-parse');
const { expect } = chai;
const { parseEther, formatEther } = ethers.utils;

const PCS_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const PCS_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
const LINK_TOKEN = "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06";
const CZUSD_TOKEN = "0xE68b79e51bf826534Ff37AA9CeE71a3842ee9c70";
const CZ_NFT = "0x6Bf5843b39EB6D5d7ee38c0b789CcdE42FE396b4";
const RABBIT_MINTER = "0x3387FFb2Ab13dDB3041573dF57041fC1b37Ba4de";
const CZ_DEPLOYER = "0x70e1cB759996a1527eD1801B169621C18a9f38F9";
const CZUSD_MINTER = "0x66992127b42249eFBA6101C1Fe1696E1E2Df09B1";
const GWEI_KEY_HASH = "0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04";

const BASE_CZUSD_LP = parseEther("10000");

describe("LuckyRabbitToken", function () {
  let owner, trader, trader1, trader2, trader3;
  let deployer, czusdMinter;
  let rabbitMinter;
  let czNft;
  let luckyRabbitToken;
  let pcsRouter;
  let czusd;
  let lrtCzusdPair;
  before(async function() {
    [owner, trader, trader1, trader2, trader3] = await ethers.getSigners();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [CZ_DEPLOYER],
    });
    deployer = await ethers.getSigner(CZ_DEPLOYER);

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [CZUSD_MINTER],
    });
    czusdMinter = await ethers.getSigner(CZUSD_MINTER);

    czNft = await ethers.getContractAt("CZodiacNFT", CZ_NFT);
    rabbitMinter = await ethers.getContractAt("RabbitMinterV3", RABBIT_MINTER);
    pcsRouter = await ethers.getContractAt("IAmmRouter02", PCS_ROUTER);
    czusd = await ethers.getContractAt("CZUsd", CZUSD_TOKEN);

    const LuckyRabbitToken = await ethers.getContractFactory("LuckyRabbitToken");
    luckyRabbitToken = await LuckyRabbitToken.deploy(
        0,//uint64 _subscriptionId,
        VRF_COORDINATOR,//address _vrfCoordinator,
        LINK_TOKEN,//address _link,
        GWEI_KEY_HASH,//bytes32 _gweiKeyHash,
        RABBIT_MINTER,//RabbitMinterV3 _rabbitMinter,
        PCS_FACTORY,//IAmmFactory _factory,
        CZUSD_TOKEN,//address _czusd,
        BASE_CZUSD_LP//uint256 _baseCzusdLocked
    );
    const lrtCzusdPairAddress = await luckyRabbitToken.ammCzusdPair();
    lrtCzusdPair = await ethers.getContractAt("IAmmPair", lrtCzusdPairAddress);

    const minterRole = await rabbitMinter.MINTER_ROLE();
    await rabbitMinter.connect(deployer).grantRole(minterRole,luckyRabbitToken.address);

    await czusd.connect(czusdMinter).mint(owner.address,parseEther("10000"));
    await czusd.approve(pcsRouter.address,ethers.constants.MaxUint256);
    await luckyRabbitToken.approve(pcsRouter.address,ethers.constants.MaxUint256);
    await pcsRouter.addLiquidity(
      luckyRabbitToken.address,
      CZUSD_TOKEN,
      parseEther("10000"),
      parseEther("10000"),
      0,
      0,
      luckyRabbitToken.address,
      ethers.constants.MaxUint256
    ) 


  });
  it("Should deploy lucky rabbit token", async function () {
    const ownerLrtBal = await luckyRabbitToken.balanceOf(owner.address);
    const pairLrtBal = await luckyRabbitToken.balanceOf(lrtCzusdPair.address);
    const pairCzusdBal = await czusd.balanceOf(lrtCzusdPair.address);
    const ownerTickets = await luckyRabbitToken.addressTickets(owner.address);
    const totalTickets = await luckyRabbitToken.totalTickets();
    const ownerHasWon = await luckyRabbitToken.addressHasWon(owner.address);
    const pairHasWon = await luckyRabbitToken.addressHasWon(lrtCzusdPair.address);
    const ownerIsExempt = await luckyRabbitToken.isExempt(owner.address);
    const pairIsExempt = await luckyRabbitToken.isExempt(lrtCzusdPair.address);
    expect(ownerLrtBal).to.eq(parseEther("0"));
    expect(pairLrtBal).to.eq(parseEther("10000"));
    expect(pairCzusdBal).to.eq(parseEther("10000"));
    expect(ownerTickets).to.eq(parseEther("0"));
    expect(totalTickets).to.eq(parseEther("0"));
    expect(ownerHasWon).to.be.true;
    expect(pairHasWon).to.be.true;
    expect(ownerIsExempt).to.be.true;
    expect(pairIsExempt).to.be.false;
  });
});
