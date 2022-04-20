//yarn hardhat run --network bscTestnet scripts/deploy_testnet_LRT.js

const {ethers} = require("hardhat");
const { parseEther, formatEther, defaultAbiCoder } = ethers.utils;
const timersPromises = require('timers/promises');

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
const LUCKYRABBITTOKEN = "0xE95412D2d374B957ca7f8d96ABe6b6c1148fA438";
const LRTPATCH_PREV = "0x8050437A017E145b585896B6E1Fd163f4AC87e1e";
const ITERABLE_ARRAY = "0x4222FFCf286610476B7b5101d55E72436e4a6065";

/*const TOTRACK = [
"0xc13196f6fec6ffbd3194adf78f64b420875a1761",
"0xfe8d999c01afb7f40abeefac282e61b054387fd5",
"0xcf992cd6680079ad32d1ee3dacb4bf931291941e",
"0xaac747ee7f76db0976481a553e51a0ce80353550",
"0xfa92708a0c47f7f9579645174fe5fcd3617434ba",
"0x03580b7f4add5c7a9a7bcb3a9c692cd0ee9f00ac",
"0xfb65c1cb1e6c92a8e58434364a96387b08dbdba8",
"0x084b2fb2c77a43b380e753021d72e95062221514",
"0x026efdfbeb89d33fa9d2ffbb01ec250c20eb24bf",
"0xcc11b4b2df582e67dd5280df3f81fd065ee8e8f7",
"0xe788db02f29ed7a9eca1c9856795b2929e411ce1",
"0xf27860bd65a807b0b0e2bc92343704f8e4671ab3",
"0x98f657d970ad3b14c5f1f4d60ee6d035eb7ac0d1",
"0x549e02a783611a023d2a3fa355e1543f7d44e663",
"0x40e97d4123944b8b3ea84089e17d8d44853a8f93",
"0xc4876c14928d1c1ebe0af4d63edddee8dbb0c432",
"0x7a09978ab157011e40377e25054d6690e1e5382a",
"0x33d8af860c63e617c171249b9dd38c345a933944",
"0x57ba6fc8f7c3b2b4876c4ca99955faa16389e9e3",
"0xc7c481222ce9fc7acf9049570a86ee2dbf4c4be0",
"0xd123d8d85afefa686fd87679fd1cf3e6f0627135",
"0xf3fab4f8115941c7ecfb62a5fd19ea0c9b3bbae9",
"0xca6886946b7a93b987682148fefcf416dc5f6f86",
"0x6f75f7fa0497eb9b908f3037b8980ec25793ad86",
"0x39b80ffb251d3ca7c6977aaeda1f0c2373d32438",
"0x43f600bbe898eb783de36f5ca32fb65ae33bd691",
"0xa42fd90551d62939172999afec34091cf0372f71",
"0x9301a742ff70685c9c49cfd154a81dede03e4335",
"0xec124a95d59c6d484e03d0a6593dac0428467351",
"0x0411b3f12cfff8c0ee24e18b2ce8a229cbb28914"
];*/

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Getting LuckyRabbitToken');
  const luckyRabbitToken =  await ethers.getContractAt("LuckyRabbitToken", LUCKYRABBITTOKEN);

  console.log('Getting RabbitMinterV3');
  const rabbitMinterV3 =  await ethers.getContractAt("RabbitMinterV3", RABBIT_MINTER_V3);

  /*console.log("Deploying iterablearray lib");
  const IterableArrayWithoutDuplicateKeys = await ethers.getContractFactory('IterableArrayWithoutDuplicateKeys')
  const iterableArrayWithoutDuplicateKeys = await IterableArrayWithoutDuplicateKeys.deploy()
  await iterableArrayWithoutDuplicateKeys.deployed();*/

  console.log('deploying LRTPatch');
  const LRTPatch = await ethers.getContractFactory("LRTPatch",{
          libraries: {
            IterableArrayWithoutDuplicateKeys: ITERABLE_ARRAY,
          },
        });
  const lrtPatch = await LRTPatch.deploy(
        SUBSCRIPTION_ID,//uint64 _subscriptionId,
        VRF_COORDINATOR,//address _vrfCoordinator,
        LINK_TOKEN,//address _link,
        GWEI_KEY_HASH,//bytes32 _gweiKeyHash,
        RABBIT_MINTER_V3,//RabbitMinterV3 _rabbitMinter,
        LUCKYRABBITTOKEN//LuckyRabbitToken _luckyRabbitToken
    );
    await lrtPatch.deployed();
  console.log("LRTPatch deployed to:", lrtPatch.address);
  await timersPromises.setTimeout(1000); //reduce likelyhood of duplicate nonces by waiting 1s
  
  /*console.log("Revoking RabbitMinterV3 mint rights from LuckyRabbitToken")
  const minterRole = await rabbitMinterV3.MINTER_ROLE();
  tx = await rabbitMinterV3.revokeRole(minterRole,luckyRabbitToken.address);
  await tx.wait();*/

  
  console.log("Revoking RabbitMinterV3 mint rights from previous LRTPATCH_PREV")
  const minterRole = await rabbitMinterV3.MINTER_ROLE();
  tx = await rabbitMinterV3.revokeRole(minterRole,"0xb944d18c44aac4fb6e5996d6074175701e791d7a");
  await tx.wait();
  await timersPromises.setTimeout(1000); //reduce likelyhood of duplicate nonces by waiting 1s
  
  console.log("Granting RabbitMinterV3 mint rights to LRTPatch")
  tx = await rabbitMinterV3.grantRole(minterRole,lrtPatch.address);
  await tx.wait();
  await timersPromises.setTimeout(1000); //reduce likelyhood of duplicate nonces by waiting 1s  

  console.log("Adding past winners")
  tx = await lrtPatch.setHasWon("0x43f600bBE898eb783DE36F5Ca32fb65aE33Bd691",true);
  await tx.wait();
  await timersPromises.setTimeout(1000); //reduce likelyhood of duplicate nonces by waiting 1s  
  tx = await lrtPatch.setHasWon("0xd6de82e23bbcf0411380fd6ac070b5a35c987051",true);
  await tx.wait();
  await timersPromises.setTimeout(1000); //reduce likelyhood of duplicate nonces by waiting 1s  
  tx = await lrtPatch.setHasWon("0x98f657d970ad3b14c5f1f4d60ee6d035eb7ac0d1",true);
  await tx.wait();
  await timersPromises.setTimeout(1000); //reduce likelyhood of duplicate nonces by waiting 1s  

  /*console.log("Tracking addresses...");
  tx = await lrtPatch.trackAddresses(TOTRACK);
  await tx.wait();
  await timersPromises.setTimeout(1000);*///reduce likelyhood of duplicate nonces by waiting 1s
}
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});
  