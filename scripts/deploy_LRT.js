//yarn hardhat run --network bscTestnet scripts/deploy_testnet_LRT.js

const {ethers} = require("hardhat");
const { parseEther, formatEther, defaultAbiCoder } = ethers.utils;

const BASE_CZUSD_LP_WAD = parseEther("10000");
const LINK_TOKEN = "0x404460c6a5ede2d891e8297795264fde62adbb75";
const VRF_COORDINATOR = "0xc587d9053cd1118f25F645F9E08BB98c9712A4EE";
const PCS_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const PCS_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const GWEI_KEY_HASH = "0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04";
const SUBSCRIPTION_ID = "73";
const CZODIAC_NFT = "0x6Bf5843b39EB6D5d7ee38c0b789CcdE42FE396b4";
const RABBIT_MINTER_V3 = "0x3387FFb2Ab13dDB3041573dF57041fC1b37Ba4de";
const CZUSD = "0xE68b79e51bf826534Ff37AA9CeE71a3842ee9c70";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Getting pcsRouter");
  const pcsRouter = await ethers.getContractAt("IAmmRouter02", PCS_ROUTER);

  console.log('Getting CZodiacNFT');
  const czodiacNFT =  await ethers.getContractAt("CZodiacNFT", CZODIAC_NFT);

  console.log('Getting RabbitMinterV3');
  const rabbitMinterV3 =  await ethers.getContractAt("RabbitMinterV3", RABBIT_MINTER_V3);

  console.log("Granting czodiacNFT mint rights to RabbitMinterV3")
  let tx = await czodiacNFT.addMinter(rabbitMinterV3.address);
  await tx.wait();

  console.log('deploying LuckyRabbitToken');
  const LuckyRabbitToken = await ethers.getContractFactory("LuckyRabbitToken");
  const luckyRabbitToken = await LuckyRabbitToken.deploy(
      SUBSCRIPTION_ID,//uint64 _subscriptionId,
      VRF_COORDINATOR,//address _vrfCoordinator,
      LINK_TOKEN,//address _link,
      GWEI_KEY_HASH,//bytes32 _gweiKeyHash,
      rabbitMinterV3.address,//RabbitMinterV3 _rabbitMinter,
      PCS_FACTORY,//IAmmFactory _factory,
      CZUSD,//address _czusd,
      BASE_CZUSD_LP_WAD //uint256 _baseCzusdLocked
  );
  console.log("LuckyRabbitToken deployed to:", luckyRabbitToken.address);
  
  console.log("Granting RabbitMinterV3 mint rights to LuckyRabbitToken")
  const minterRole = await rabbitMinterV3.MINTER_ROLE();
  tx = await rabbitMinterV3.grantRole(minterRole,luckyRabbitToken.address);
  await tx.wait();
}
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});
  