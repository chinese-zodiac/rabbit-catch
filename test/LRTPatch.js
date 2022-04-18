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
const LUCKYRABBITTOKEN = "0xE95412D2d374B957ca7f8d96ABe6b6c1148fA438";

const TOTRACK = [
"0x0411b3f12cfff8c0ee24e18b2ce8a229cbb28914",
"0xec124a95d59c6d484e03d0a6593dac0428467351",
"0x9301a742ff70685c9c49cfd154a81dede03e4335",
"0xa42fd90551d62939172999afec34091cf0372f71",
"0x43f600bbe898eb783de36f5ca32fb65ae33bd691",
"0x39b80ffb251d3ca7c6977aaeda1f0c2373d32438",
"0x6f75f7fa0497eb9b908f3037b8980ec25793ad86",
"0xd123d8d85afefa686fd87679fd1cf3e6f0627135",
"0x57ba6fc8f7c3b2b4876c4ca99955faa16389e9e3",
"0x33d8af860c63e617c171249b9dd38c345a933944",
"0x7a09978ab157011e40377e25054d6690e1e5382a",
"0xc4876c14928d1c1ebe0af4d63edddee8dbb0c432",
"0x40e97d4123944b8b3ea84089e17d8d44853a8f93",
"0x549e02a783611a023d2a3fa355e1543f7d44e663",
"0xf3fab4f8115941c7ecfb62a5fd19ea0c9b3bbae9",
"0x98f657d970ad3b14c5f1f4d60ee6d035eb7ac0d1",
"0xf27860bd65a807b0b0e2bc92343704f8e4671ab3",
"0xcc11b4b2df582e67dd5280df3f81fd065ee8e8f7",
"0x026efdfbeb89d33fa9d2ffbb01ec250c20eb24bf",
"0x084b2fb2c77a43b380e753021d72e95062221514",
"0xe788db02f29ed7a9eca1c9856795b2929e411ce1",
"0xfb65c1cb1e6c92a8e58434364a96387b08dbdba8",
"0x03580b7f4add5c7a9a7bcb3a9c692cd0ee9f00ac",
"0xfa92708a0c47f7f9579645174fe5fcd3617434ba",
"0xe83df3df909795dae4633eff5acc09148a32936f",
"0xaac747ee7f76db0976481a553e51a0ce80353550",
"0xcf992cd6680079ad32d1ee3dacb4bf931291941e",
"0xfe8d999c01afb7f40abeefac282e61b054387fd5",
"0xc13196f6fec6ffbd3194adf78f64b420875a1761",
"0xedeeff704a0c0ae871e615421dd86c769181bb33",
"0x9C9513E1b6F6F73D98F1FD99C3a5C2d7e81a3dd9"
]

const BASE_CZUSD_LP = parseEther("10000");

const checkDataVrf = defaultAbiCoder.encode(["uint8"],[0]);
const checkDataMint = defaultAbiCoder.encode(["uint8"],[1]);


describe("LRTPatch", function () {
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
  let lrtPatch;
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
    luckyRabbitToken = await ethers.getContractAt("LuckyRabbitToken", LUCKYRABBITTOKEN);

    const lrtCzusdPairAddress = await luckyRabbitToken.ammCzusdPair();
    lrtCzusdPair = await ethers.getContractAt("IAmmPair", lrtCzusdPairAddress);

    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    vrfCoordinatorMock = await VRFCoordinatorV2Mock.deploy(parseEther("0.005"),5000000000*27); //27 LINK = 1 BNB, BSC gas price of 5 gwei
    await vrfCoordinatorMock.deployed();
    await vrfCoordinatorMock.createSubscription();
    subscriptionId = 1; //First subscription is always 1
    await vrfCoordinatorMock.fundSubscription(subscriptionId,parseEther("100"));

    const IterableArrayWithoutDuplicateKeys = await ethers.getContractFactory('IterableArrayWithoutDuplicateKeys')
    const iterableArrayWithoutDuplicateKeys = await IterableArrayWithoutDuplicateKeys.deploy()
    await iterableArrayWithoutDuplicateKeys.deployed();

    const LRTPatch = await ethers.getContractFactory("LRTPatch",{
          libraries: {
            IterableArrayWithoutDuplicateKeys: iterableArrayWithoutDuplicateKeys.address,
          },
        });
    lrtPatch = await LRTPatch.deploy(
        subscriptionId,//uint64 _subscriptionId,
        vrfCoordinatorMock.address,//address _vrfCoordinator,
        LINK_TOKEN,//address _link,
        GWEI_KEY_HASH,//bytes32 _gweiKeyHash,
        rabbitMinter.address,//RabbitMinterV3 _rabbitMinter,
        luckyRabbitToken.address//LuckyRabbitToken _luckyRabbitToken
    );
    await lrtPatch.deployed();
    
    const minterRole = await rabbitMinter.MINTER_ROLE();
    await rabbitMinter.connect(deployer).grantRole(minterRole,lrtPatch.address);

    await lrtPatch.trackAddresses(TOTRACK);
  });
  it("Should deploy lrtPatch", async function () {
    const rabbitsToMint = await lrtPatch.rabbitsToMint();
    const totalRabbitsMinted = await lrtPatch.totalRabbitsMinted();
    const lastRabbitMintEpoch = await lrtPatch.lastRabbitMintEpoch();
    const totalTickets = await lrtPatch.totalTickets();
    const addressIndex = await lrtPatch.getAddressTicketBucketIndex(owner.address);
    const trackedAddressCount = await lrtPatch.getTrackedAddressCount();
    expect(rabbitsToMint).to.eq(0);
    expect(totalRabbitsMinted).to.eq(1);
    expect(lastRabbitMintEpoch).to.eq(1650077561);
    expect(totalTickets).to.eq(0);
    expect(addressIndex).to.eq(-1);
    expect(trackedAddressCount).to.eq(31);
  });
  it("Should get tickets", async function () {
    await lrtPatch.trackAddresses([trader1.address,trader2.address,trader3.address]);
    await czusd.connect(czusdMinter).mint(trader1.address,parseEther("10000"));
    await czusd.connect(czusdMinter).mint(trader2.address,parseEther("10000"));
    await czusd.connect(czusdMinter).mint(trader3.address,parseEther("10000"));
    await czusd.connect(trader1).approve(pcsRouter.address,ethers.constants.MaxUint256);
    await czusd.connect(trader2).approve(pcsRouter.address,ethers.constants.MaxUint256);
    await czusd.connect(trader3).approve(pcsRouter.address,ethers.constants.MaxUint256);
    await pcsRouter.connect(trader1).swapExactTokensForTokensSupportingFeeOnTransferTokens(
        parseEther("100"),
        0,
        [czusd.address,luckyRabbitToken.address],
        trader1.address,
        ethers.constants.MaxUint256
    );
    await pcsRouter.connect(trader2).swapExactTokensForTokensSupportingFeeOnTransferTokens(
        parseEther("300"),
        0,
        [czusd.address,luckyRabbitToken.address],
        trader2.address,
        ethers.constants.MaxUint256
    );
    await pcsRouter.connect(trader3).swapExactTokensForTokensSupportingFeeOnTransferTokens(
        parseEther("1000"),
        0,
        [czusd.address,luckyRabbitToken.address],
        trader3.address,
        ethers.constants.MaxUint256
    );
    await lrtPatch.trackAddresses([trader1.address,trader2.address,trader3.address]);
    const trackedAddressCountInitial = await lrtPatch.getTrackedAddressCount();
    await lrtPatch.updateAccounts(0,trackedAddressCountInitial);
    const trackedAddressCountFinal = await lrtPatch.getTrackedAddressCount();

    const trader1Tickets = await lrtPatch.getAddressTickets(trader1.address);
    const trader1TicketBucketIndex = await lrtPatch.getAddressTicketBucketIndex(trader1.address);
    const trader1TrackedIndex = await lrtPatch.getTrackedAddressIndex(trader1.address);

    const trader2Tickets = await lrtPatch.getAddressTickets(trader2.address);
    const trader2TicketBucketIndex = await lrtPatch.getAddressTicketBucketIndex(trader2.address);
    const trader2TrackedIndex = await lrtPatch.getTrackedAddressIndex(trader2.address);

    const trader3Tickets = await lrtPatch.getAddressTickets(trader3.address);
    const trader3TicketBucketIndex = await lrtPatch.getAddressTicketBucketIndex(trader3.address);
    const trader3TrackedIndex = await lrtPatch.getTrackedAddressIndex(trader3.address);

    const firstTrackedAddress = "0x0411b3f12cfff8c0ee24e18b2ce8a229cbb28914"
    const firstTrackedTickets = await lrtPatch.getAddressTickets(firstTrackedAddress);
    const firstTrackedTicketBucketIndex = await lrtPatch.getAddressTicketBucketIndex(firstTrackedAddress);
    const firstTrackedTrackedIndex = await lrtPatch.getTrackedAddressIndex(firstTrackedAddress);

    const totalTickets = await lrtPatch.totalTickets();

    const bucket49Size = await lrtPatch.getTicketBucketSize(49);
    const bucket145Size = await lrtPatch.getTicketBucketSize(145);
    const bucket200Size = await lrtPatch.getTicketBucketSize(200);

    expect(trader1Tickets).to.eq(49);
    expect(trader1TicketBucketIndex).to.eq(0);
    expect(trader1TrackedIndex).to.eq(31);
    expect(trader2Tickets).to.eq(145);
    expect(trader2TicketBucketIndex).to.eq(0);
    expect(trader2TrackedIndex).to.eq(29);
    expect(trader3Tickets).to.eq(200);
    expect(trader3TicketBucketIndex).to.eq(0);
    expect(trader3TrackedIndex).to.eq(30);
    expect(firstTrackedTickets).to.eq(200);
    expect(firstTrackedTicketBucketIndex).to.eq(bucket200Size.sub(1));
    expect(firstTrackedTrackedIndex).to.eq(0);
    expect(bucket49Size).to.eq(1);
    expect(bucket145Size).to.eq(1);
    expect(bucket200Size).to.eq(5);
    expect(totalTickets).to.eq(2042);
    expect(trackedAddressCountInitial).to.eq(34); //added 3
    expect(trackedAddressCountFinal).to.eq(32); //updateAccounts should have deleted 1 account that has won, 1 account with less than 1 LRT
  });
  it("Should pick winners from seed", async function () {

    const getWinner1 = await luckyRabbitToken.getWinner(0);
    const getWinner2 = await luckyRabbitToken.getWinner(1);
    const getWinner3 = await luckyRabbitToken.getWinner(87);
    const getWinner4 = await luckyRabbitToken.getWinner(88);
    const getWinner5 = await luckyRabbitToken.getWinner(89);
    const getWinner6 = await luckyRabbitToken.getWinner(10000);
    const getWinner7 = await luckyRabbitToken.getWinner(10247);
    const getWinner8 = await luckyRabbitToken.getWinner(2041);

    expect(getWinner1).to.eq("0xcf992cd6680079Ad32d1ee3DAcb4Bf931291941E");
    expect(getWinner2).to.eq("0xd6DE82E23BbCF0411380FD6ac070b5A35c987051");
    expect(getWinner3).to.eq("0xCc11b4b2Df582E67Dd5280Df3F81FD065Ee8e8F7");
    expect(getWinner4).to.eq("0x026eFdFBeb89D33fA9d2fFBB01EC250c20eB24BF");
    expect(getWinner5).to.eq("0xCc11b4b2Df582E67Dd5280Df3F81FD065Ee8e8F7");
    expect(getWinner6).to.eq("0xA42fd90551D62939172999aFEc34091cF0372f71");
    expect(getWinner7).to.eq("0x03580b7f4AdD5C7A9a7bcB3A9C692cD0EE9F00ac");  
    expect(getWinner8).to.eq("0x0411B3F12cffF8c0Ee24E18B2ce8a229cBb28914");  

  });
  it("Should get random words", async function () {
    await pcsRouter.connect(trader3).swapExactTokensForTokensSupportingFeeOnTransferTokens(
        parseEther("8000"),
        0,
        [czusd.address,luckyRabbitToken.address],
        trader3.address,
        ethers.constants.MaxUint256
    );
    await luckyRabbitToken.connect(trader3).approve(pcsRouter.address,ethers.constants.MaxUint256);
    const trader3Bal = luckyRabbitToken.balanceOf(trader3.address);
    await pcsRouter.connect(trader3).swapExactTokensForTokensSupportingFeeOnTransferTokens(
        trader3Bal,
        0,
        [luckyRabbitToken.address,czusd.address],
        trader3.address,
        ethers.constants.MaxUint256
    );
    const rabbitsToMint = await lrtPatch.rabbitsToMint();

    await time.increase(time.duration.days(1));
    await time.advanceBlock();

    const vrfGasEsimation = await lrtPatch.estimateGas.performUpkeep(checkDataVrf);

    await lrtPatch.performUpkeep(checkDataVrf);
    const requestId = await lrtPatch.vrfRequestId();
    const isVrfPendingInitial = await lrtPatch.state_isVrfPending();
    const checkUpkeepMintInitial = await lrtPatch.checkUpkeep(checkDataMint);
    await vrfCoordinatorMock.fulfillRandomWords(requestId,lrtPatch.address);
    const randomWord = await lrtPatch.randomWord();
    const isVrfPendingFinal = await lrtPatch.state_isVrfPending();
    const checkUpkeepVrf = await lrtPatch.checkUpkeep(checkDataVrf);
    const checkUpkeepMintFinal = await lrtPatch.checkUpkeep(checkDataMint);


    const trader3Tickets = await lrtPatch.getAddressTickets(trader3.address);
    const trader3TicketBucketIndex = await lrtPatch.getAddressTicketBucketIndex(trader3.address);
    const trader3TrackedIndex = await lrtPatch.getTrackedAddressIndex(trader3.address);

    const trader1Tickets = await lrtPatch.getAddressTickets(trader1.address);
    const trader1TicketBucketIndex = await lrtPatch.getAddressTicketBucketIndex(trader1.address);
    const trader1TrackedIndex = await lrtPatch.getTrackedAddressIndex(trader1.address);

    const trader2Tickets = await lrtPatch.getAddressTickets(trader2.address);
    const trader2TicketBucketIndex = await lrtPatch.getAddressTicketBucketIndex(trader2.address);
    const trader2TrackedIndex = await lrtPatch.getTrackedAddressIndex(trader2.address);

    const bucket200Size = await lrtPatch.getTicketBucketSize(200);

    expect(rabbitsToMint).to.eq(3);
    expect(vrfGasEsimation.toNumber()).to.eq(611704);
    expect(randomWord).to.not.eq(0);
    expect(isVrfPendingInitial).to.be.true;
    expect(isVrfPendingFinal).to.be.false;
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(checkUpkeepMintInitial[0]).to.be.false;
    expect(checkUpkeepMintFinal[0]).to.be.true;

    expect(trader1Tickets).to.eq(49);
    expect(trader1TicketBucketIndex).to.eq(0);
    expect(trader1TrackedIndex).to.eq(30);
    expect(trader2Tickets).to.eq(145);
    expect(trader2TicketBucketIndex).to.eq(0);
    expect(trader2TrackedIndex).to.eq(29);
    expect(trader3Tickets).to.eq(0);
    expect(trader3TicketBucketIndex).to.eq(-1);
    expect(trader3TrackedIndex).to.eq(-1);
    expect(bucket200Size).to.eq(4);
  });
  it("Should mint NFT to winner", async function () {
    const mintGasEsimation = await lrtPatch.estimateGas.performUpkeep(checkDataMint);
    const word = await lrtPatch.randomWord();
    const winner = await lrtPatch.getWinner(word);
    await lrtPatch.performUpkeep(checkDataMint);
    const currentTime = (await time.latest()).toNumber();
    const nftBal = await czNft.balanceOf(winner);
    const lastRabbitMintEpoch = await lrtPatch.lastRabbitMintEpoch();
    const checkUpkeepVrf = await lrtPatch.checkUpkeep(checkDataVrf);
    const checkUpkeepMint = await lrtPatch.checkUpkeep(checkDataMint);
    const rabbitsToMint = await lrtPatch.rabbitsToMint();
    const winnerTickets = await lrtPatch.addressTickets(winner);
    const totalTickets = await lrtPatch.totalTickets();
    expect(mintGasEsimation.toNumber()).to.eq(868323);
    expect(nftBal).to.eq(19);
    expect(checkUpkeepVrf[0]).to.be.false;
    expect(rabbitsToMint).to.eq(2);
    expect(checkUpkeepMint[0]).to.be.false;
    expect(lastRabbitMintEpoch).to.equal(currentTime);
    expect(winnerTickets).to.eq(0);
    expect(totalTickets).to.eq(1707);
    expect(winner).to.eq("0x43f600bBE898eb783DE36F5Ca32fb65aE33Bd691");
  });


})

