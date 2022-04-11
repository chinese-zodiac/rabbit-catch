//yarn hardhat run --network bscTestnet scripts/deploy_testnet_LRT.js

const {ethers} = require("hardhat");
const { parseEther, formatEther, defaultAbiCoder } = ethers.utils;

const BASE_CZUSD_LP_WAD = parseEther("10000");
const LINK_TOKEN = "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06";
const VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
const PCS_FACTORY = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
const PCS_ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
const GWEI_KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
const SUBSCRIPTION_ID = "485";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Getting pcsRouter");
  const pcsRouter = await ethers.getContractAt("IAmmRouter02", PCS_ROUTER);

  console.log('deploying CZodiacNFT');
  const CZodiacNFT = await ethers.getContractFactory("CZodiacNFT");
  const czodiacNFT = await CZodiacNFT.deploy();
  await czodiacNFT.deployed();
  console.log("CZodiacNFT deployed at",czodiacNFT.address);

  console.log('deploying RabbitMinterV3');
  const RabbitMinterV3 = await ethers.getContractFactory("RabbitMinterV3");
  const rabbitMinterV3 = await RabbitMinterV3.deploy();
  await rabbitMinterV3.deployed();
  console.log("RabbitMinterV3 deployed at",rabbitMinterV3.address);

  console.log("Granting czodiacNFT mint rights to RabbitMinterV3")
  let tx = await czodiacNFT.addMinter(rabbitMinterV3.address);
  await tx.wait();
  
  console.log('deploying CZUsd');
  const CZUsd = await ethers.getContractFactory("CZUsd");
  const czusd = await CZUsd.deploy();
  await czusd.deployed();
  console.log("CZUsd deployed to:", czusd.address);

  console.log('deploying LuckyRabbitToken');
  const LuckyRabbitToken = await ethers.getContractFactory("LuckyRabbitToken");
  const luckyRabbitToken = await LuckyRabbitToken.deploy(
      SUBSCRIPTION_ID,//uint64 _subscriptionId,
      VRF_COORDINATOR,//address _vrfCoordinator,
      LINK_TOKEN,//address _link,
      GWEI_KEY_HASH,//bytes32 _gweiKeyHash,
      rabbitMinterV3.address,//RabbitMinterV3 _rabbitMinter,
      PCS_FACTORY,//IAmmFactory _factory,
      czusd.address,//address _czusd,
      BASE_CZUSD_LP_WAD //uint256 _baseCzusdLocked
  );
  console.log("LuckyRabbitToken deployed to:", luckyRabbitToken.address);
  
  console.log("Granting RabbitMinterV3 mint rights to LuckyRabbitToken")
  const minterRole = await rabbitMinterV3.MINTER_ROLE();
  tx = await rabbitMinterV3.grantRole(minterRole,luckyRabbitToken.address);
  await tx.wait();

  console.log("Mint and add lp");
  console.log("mint");
  tx = await czusd.mint(deployer.address,parseEther("10000"));
  await tx.wait();
  console.log("approve czusd");
  tx = await czusd.approve(pcsRouter.address,ethers.constants.MaxUint256);
  await tx.wait();
  console.log("approve lrt");
  tx = await luckyRabbitToken.approve(pcsRouter.address,ethers.constants.MaxUint256);
  await tx.wait();
  console.log("addLiquidity");
  tx = await pcsRouter.addLiquidity(
    luckyRabbitToken.address,
    czusd.address,
    parseEther("10000"),
    parseEther("10000"),
    0,
    0,
    luckyRabbitToken.address,
    ethers.constants.MaxUint256
  );
  await tx.wait();
  console.log("Complete.");
}
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});
  