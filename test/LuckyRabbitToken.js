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
const { parseEther, formatEther, defaultAbiCoder } = ethers.utils;

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

const checkDataVrf = defaultAbiCoder.encode(["uint8"],[0]);
const checkDataMint = defaultAbiCoder.encode(["uint8"],[1]);

describe("LuckyRabbitToken", function () {
  let owner, trader, trader1, trader2, trader3;
  let deployer, czusdMinter, vrfCoordinatorMock;
  let rabbitMinter;
  let czNft;
  let luckyRabbitToken;
  let pcsRouter;
  let czusd;
  let lrtCzusdPair;
  before(async function() {
    [owner, trader, trader1, trader2, trader3, vrfCoordinatorMock] = await ethers.getSigners();

    //console.log("Get deployer");
    await hre.network.provider.request({ 
      method: "hardhat_impersonateAccount",
      params: [CZ_DEPLOYER],
    });
    deployer = await ethers.getSigner(CZ_DEPLOYER);

    //console.log("Get minter");
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [CZUSD_MINTER],
    });
    czusdMinter = await ethers.getSigner(CZUSD_MINTER);

    //console.log("Get contracts");
    czNft = await ethers.getContractAt("CZodiacNFT", CZ_NFT);
    rabbitMinter = await ethers.getContractAt("RabbitMinterV3", RABBIT_MINTER);
    pcsRouter = await ethers.getContractAt("IAmmRouter02", PCS_ROUTER);
    czusd = await ethers.getContractAt("CZUsd", CZUSD_TOKEN);

    //console.log("Deploy LRT");
    const LuckyRabbitToken = await ethers.getContractFactory("LuckyRabbitToken");
    luckyRabbitToken = await LuckyRabbitToken.deploy(
        0,//uint64 _subscriptionId,
        vrfCoordinatorMock.address,//address _vrfCoordinator,
        LINK_TOKEN,//address _link,
        GWEI_KEY_HASH,//bytes32 _gweiKeyHash,
        RABBIT_MINTER,//RabbitMinterV3 _rabbitMinter,
        PCS_FACTORY,//IAmmFactory _factory,
        CZUSD_TOKEN,//address _czusd,
        BASE_CZUSD_LP//uint256 _baseCzusdLocked
    );
    //console.log("Get LRT amm pair");
    const lrtCzusdPairAddress = await luckyRabbitToken.ammCzusdPair();
    lrtCzusdPair = await ethers.getContractAt("IAmmPair", lrtCzusdPairAddress);

    //console.log("Grant minter role");
    const minterRole = await rabbitMinter.MINTER_ROLE();
    await rabbitMinter.connect(deployer).grantRole(minterRole,luckyRabbitToken.address);

    //console.log("Mint and add lp");
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
  it("Should burn 10% on buy and get tickets", async function () {
    await czusd.connect(czusdMinter).mint(trader.address,parseEther("10000"));
    await czusd.connect(trader).approve(pcsRouter.address,ethers.constants.MaxUint256);
    await pcsRouter.connect(trader).swapExactTokensForTokensSupportingFeeOnTransferTokens(
        parseEther("100"),
        0,
        [czusd.address,luckyRabbitToken.address],
        trader.address,
        ethers.constants.MaxUint256
    );
    const traderBal = await luckyRabbitToken.balanceOf(trader.address);
    const totalSupply = await luckyRabbitToken.totalSupply();
    const lockedCzusd = await luckyRabbitToken.lockedCzusd();
    const traderTickets = await luckyRabbitToken.addressTickets(trader.address);
    const totalTickets = await luckyRabbitToken.totalTickets();
    const traderTicketBucketIndex = await luckyRabbitToken.addressTicketBucketIndex(trader.address);
    const rabbitsToMint = await luckyRabbitToken.rabbitsToMint();
    const checkUpkeepVrf = await luckyRabbitToken.checkUpkeep(checkDataVrf);
    const checkUpkeepMint = await luckyRabbitToken.checkUpkeep(checkDataMint);
    const getWinner = await luckyRabbitToken.getWinner(Math.floor(Math.random()*100000));
    expect(traderBal).to.be.closeTo(parseEther("88.8"),parseEther("0.1"));
    expect(totalSupply).to.be.closeTo(parseEther("9990.1"),parseEther("0.1"));
    expect(lockedCzusd).to.be.closeTo(parseEther("10010.3"),parseEther("0.1"));
    expect(traderTickets).to.eq(88);
    expect(totalTickets).to.eq(88);
    expect(traderTicketBucketIndex).to.eq(0);
    expect(rabbitsToMint).to.eq(0);
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(checkUpkeepMint[0]).to.be.false;
    expect(getWinner.toUpperCase()).to.eq(trader.address.toUpperCase());
  });
  it("Should grant max of 200 tickets", async function () {
    await pcsRouter.connect(trader).swapExactTokensForTokensSupportingFeeOnTransferTokens(
        parseEther("3000"),
        0,
        [czusd.address,luckyRabbitToken.address],
        trader.address,
        ethers.constants.MaxUint256
    );
    const traderTickets = await luckyRabbitToken.addressTickets(trader.address);
    const totalTickets = await luckyRabbitToken.totalTickets();
    const traderTicketBucketIndex = await luckyRabbitToken.addressTicketBucketIndex(trader.address);
    const lockedCzusd = await luckyRabbitToken.lockedCzusd();
    const rabbitsToMint = await luckyRabbitToken.rabbitsToMint();
    const checkUpkeepVrf = await luckyRabbitToken.checkUpkeep(checkDataVrf);
    const checkUpkeepMint = await luckyRabbitToken.checkUpkeep(checkDataMint);
    const getWinner = await luckyRabbitToken.getWinner(Math.floor(Math.random()*100000));
    expect(lockedCzusd).to.be.closeTo(parseEther("10252.4"),parseEther("0.1"));
    expect(traderTickets).to.eq(200);
    expect(totalTickets).to.eq(200);
    expect(traderTicketBucketIndex).to.eq(0);
    expect(rabbitsToMint).to.eq(1);
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(checkUpkeepMint[0]).to.be.false;
    expect(getWinner.toUpperCase()).to.eq(trader.address.toUpperCase());
    await expect(luckyRabbitToken.performUpkeep(checkDataVrf)).to.be.reverted;
    await expect(luckyRabbitToken.performUpkeep(checkDataMint)).to.be.reverted;
  });
  it("Should enable vrf after 24 hours", async function () {
    await time.increase(time.duration.days(1));
    await time.advanceBlock();
    const checkUpkeepVrf = await luckyRabbitToken.checkUpkeep(checkDataVrf);
    const checkUpkeepMint = await luckyRabbitToken.checkUpkeep(checkDataMint);
    expect(checkUpkeepVrf[0]).to.be.true;
    expect(checkUpkeepMint[0]).to.be.false;
    await expect(luckyRabbitToken.performUpkeep(checkDataMint)).to.be.reverted;
  });
});
