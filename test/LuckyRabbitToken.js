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
  let deployer, czusdMinter;
  let rabbitMinter;
  let czNft;
  let luckyRabbitToken;
  let pcsRouter;
  let czusd;
  let lrtCzusdPair;
  let vrfCoordinatorMock;
  let subscriptionId;
  before(async function() {
    [owner, trader, trader1, trader2, trader3] = await ethers.getSigners();

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

    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    vrfCoordinatorMock = await VRFCoordinatorV2Mock.deploy(parseEther("0.005"),5000000000*27); //27 LINK = 1 BNB, BSC gas price of 5 gwei
    await vrfCoordinatorMock.deployed();
    await vrfCoordinatorMock.createSubscription();
    subscriptionId = 1; //First subscription is always 1
    await vrfCoordinatorMock.fundSubscription(subscriptionId,parseEther("100"));

    //console.log("Deploy LRT");
    const LuckyRabbitToken = await ethers.getContractFactory("LuckyRabbitToken");
    luckyRabbitToken = await LuckyRabbitToken.deploy(
        subscriptionId,//uint64 _subscriptionId,
        vrfCoordinatorMock.address,//address _vrfCoordinator,
        LINK_TOKEN,//address _link,
        GWEI_KEY_HASH,//bytes32 _gweiKeyHash,
        RABBIT_MINTER,//RabbitMinterV3 _rabbitMinter,
        PCS_FACTORY,//IAmmFactory _factory,
        CZUSD_TOKEN,//address _czusd,
        BASE_CZUSD_LP//uint256 _baseCzusdLocked
    );
    await luckyRabbitToken.deployed();
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
    const getWinner1 = await luckyRabbitToken.getWinner(0);
    const getWinner2 = await luckyRabbitToken.getWinner(1);
    const getWinner3 = await luckyRabbitToken.getWinner(87);
    const getWinner4 = await luckyRabbitToken.getWinner(88);
    const getWinner5 = await luckyRabbitToken.getWinner(89);
    const getWinner6 = await luckyRabbitToken.getWinner(10000);
    expect(traderBal).to.be.closeTo(parseEther("88.8"),parseEther("0.1"));
    expect(totalSupply).to.be.closeTo(parseEther("9990.1"),parseEther("0.1"));
    expect(lockedCzusd).to.be.closeTo(parseEther("10010.3"),parseEther("0.1"));
    expect(traderTickets).to.eq(88);
    expect(totalTickets).to.eq(88);
    expect(traderTicketBucketIndex).to.eq(0);
    expect(rabbitsToMint).to.eq(0);
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(checkUpkeepMint[0]).to.be.false;
    expect(getWinner1.toUpperCase()).to.eq(trader.address.toUpperCase());
    expect(getWinner2.toUpperCase()).to.eq(trader.address.toUpperCase());
    expect(getWinner3.toUpperCase()).to.eq(trader.address.toUpperCase());
    expect(getWinner4.toUpperCase()).to.eq(trader.address.toUpperCase());
    expect(getWinner5.toUpperCase()).to.eq(trader.address.toUpperCase());
    expect(getWinner6.toUpperCase()).to.eq(trader.address.toUpperCase());
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
    const getWinner1 = await luckyRabbitToken.getWinner(1);
    const getWinner2 = await luckyRabbitToken.getWinner(89);
    expect(lockedCzusd).to.be.closeTo(parseEther("10252.4"),parseEther("0.1"));
    expect(traderTickets).to.eq(200);
    expect(totalTickets).to.eq(200);
    expect(traderTicketBucketIndex).to.eq(0);
    expect(rabbitsToMint).to.eq(1);
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(checkUpkeepMint[0]).to.be.false;
    expect(getWinner1.toUpperCase()).to.eq(trader.address.toUpperCase());
    expect(getWinner2.toUpperCase()).to.eq(trader.address.toUpperCase());
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
  it("Should get random words", async function () {
    const vrfGasEsimation = await luckyRabbitToken.estimateGas.performUpkeep(checkDataVrf);
    await luckyRabbitToken.performUpkeep(checkDataVrf);
    const requestId = await luckyRabbitToken.vrfRequestId();
    const subBalInitial = (await vrfCoordinatorMock.getSubscription(subscriptionId)).balance;
    const isVrfPendingInitial = await luckyRabbitToken.isVrfPending();
    const checkUpkeepMintInitial = await luckyRabbitToken.checkUpkeep(checkDataMint);
    await vrfCoordinatorMock.fulfillRandomWords(requestId,luckyRabbitToken.address);
    const randomWord = await luckyRabbitToken.randomWord();
    const isVrfPendingFinal = await luckyRabbitToken.isVrfPending();
    const checkUpkeepVrf = await luckyRabbitToken.checkUpkeep(checkDataVrf);
    const checkUpkeepMintFinal = await luckyRabbitToken.checkUpkeep(checkDataMint);
    const subBalFinal = (await vrfCoordinatorMock.getSubscription(subscriptionId)).balance;
    expect(vrfGasEsimation.toNumber()).to.eq(141997);
    expect(randomWord).to.not.eq(0);
    expect(isVrfPendingInitial).to.be.true;
    expect(isVrfPendingFinal).to.be.false;
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(checkUpkeepMintInitial[0]).to.be.false;
    expect(checkUpkeepMintFinal[0]).to.be.true;
    expect(subBalInitial.sub(subBalFinal)).to.be.closeTo(parseEther("0.0097"),parseEther("0.0001"))
  });
  it("Should mint NFT to winner", async function () {
    const mintGasEsimation = await luckyRabbitToken.estimateGas.performUpkeep(checkDataMint);
    await luckyRabbitToken.performUpkeep(checkDataMint);
    const currentTime = (await time.latest()).toNumber();
    const nftBal = await czNft.balanceOf(trader.address);
    const lastRabbitMintEpoch = await luckyRabbitToken.lastRabbitMintEpoch();
    const checkUpkeepVrf = await luckyRabbitToken.checkUpkeep(checkDataVrf);
    const checkUpkeepMint = await luckyRabbitToken.checkUpkeep(checkDataMint);
    const rabbitsToMint = await luckyRabbitToken.rabbitsToMint();
    const traderTickets = await luckyRabbitToken.addressTickets(trader.address);
    const totalTickets = await luckyRabbitToken.totalTickets();
    expect(mintGasEsimation.toNumber()).to.eq(910790);
    expect(nftBal).to.eq(1);
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(rabbitsToMint).to.eq(0);
    expect(checkUpkeepMint[0]).to.be.false;
    expect(lastRabbitMintEpoch).to.equal(currentTime);
    expect(traderTickets).to.eq(0);
    expect(totalTickets).to.eq(0);
  });
  it("Should pick correct winner", async function () {
      const balToSell = await luckyRabbitToken.balanceOf(trader.address);
      await luckyRabbitToken.connect(trader).approve(pcsRouter.address,ethers.constants.MaxUint256);
      await pcsRouter.connect(trader).swapExactTokensForTokensSupportingFeeOnTransferTokens(
          balToSell,
          0,
          [luckyRabbitToken.address,czusd.address],
          trader.address,
          ethers.constants.MaxUint256
      );

      await time.increase(time.duration.days(1));
      await time.advanceBlock();
      await czusd.connect(czusdMinter).mint(trader1.address,parseEther("10000"));
      await czusd.connect(czusdMinter).mint(trader2.address,parseEther("10000"));
      await czusd.connect(czusdMinter).mint(trader3.address,parseEther("10000"));
      await czusd.connect(trader1).approve(pcsRouter.address,ethers.constants.MaxUint256);
      await czusd.connect(trader2).approve(pcsRouter.address,ethers.constants.MaxUint256);
      await czusd.connect(trader3).approve(pcsRouter.address,ethers.constants.MaxUint256);
      await pcsRouter.connect(trader1).swapExactTokensForTokensSupportingFeeOnTransferTokens(
          parseEther("50"),
          0,
          [czusd.address,luckyRabbitToken.address],
          trader1.address,
          ethers.constants.MaxUint256
      );
      await pcsRouter.connect(trader2).swapExactTokensForTokensSupportingFeeOnTransferTokens(
          parseEther("1500"),
          0,
          [czusd.address,luckyRabbitToken.address],
          trader2.address,
          ethers.constants.MaxUint256
      );
      await pcsRouter.connect(trader3).swapExactTokensForTokensSupportingFeeOnTransferTokens(
          parseEther("10000"),
          0,
          [czusd.address,luckyRabbitToken.address],
          trader3.address,
          ethers.constants.MaxUint256
      );
      const trader1Tickets = await luckyRabbitToken.addressTickets(trader1.address);
      const trader2Tickets = await luckyRabbitToken.addressTickets(trader2.address);
      const trader3Tickets = await luckyRabbitToken.addressTickets(trader3.address);
      const rabbitsToMint = await luckyRabbitToken.rabbitsToMint();
      const totalTickets = await luckyRabbitToken.totalTickets();
      const lockedCzusd = await luckyRabbitToken.lockedCzusd();

      const getWinner1 = await luckyRabbitToken.getWinner(1);
      const getWinner2 = await luckyRabbitToken.getWinner(42);
      const getWinner3 = await luckyRabbitToken.getWinner(43);


      expect(trader1Tickets).to.eq(40);
      expect(trader2Tickets).to.eq(200);
      expect(trader3Tickets).to.eq(200);
      expect(rabbitsToMint).to.eq(3);
      expect(totalTickets).to.eq(440);
      expect(lockedCzusd).to.be.closeTo(parseEther("11087"),parseEther("1"))

      expect(getWinner1).to.eq(trader1.address);
      expect(getWinner2).to.eq(trader2.address);
      expect(getWinner3).to.eq(trader3.address);
      

  });
});
