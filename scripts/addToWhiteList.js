// SUBJECT_ADDRESS is the address we want to add to the whitelist

// set PRIVATE_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// set MASTER_ADDRESS=0xXXXXXXXXXXXXXXXXXXXXXXXXXX
// set SUBJECT_ADDRESS=0XXXXXXXXXXXXXXXXXXX


//npx hardhat run --network bscTestnet scripts/addToWhiteList.js

const {ethers} = require("hardhat");


async function main() {

    if (!process.env.MASTER_ADDRESS) {
        throw new Error('Please config env variable MASTER_ADDRESS');
    }

    if (!process.env.SUBJECT_ADDRESS) {
        throw new Error('Please config env variable SUBJECT_ADDRESS');
    }

    const [deployer] = await ethers.getSigners();

    console.log(`running with account ${deployer.address}  .... it will take some time`);

    const RabbitCatchMasterfactory = await ethers.getContractFactory("RabbitCatchMaster");

    const rabbitCatchMaster = await RabbitCatchMasterfactory.attach(process.env.MASTER_ADDRESS);

    const owner = await rabbitCatchMaster.owner();
    console.log("RabbitCatchMaster owner is", owner);

    if(owner != deployer.address){
        throw 'not running with ownser account';
    }

    console.log(`checking white list for ${process.env.SUBJECT_ADDRESS}`);

    let onWhiteList = await rabbitCatchMaster.whitelist(process.env.SUBJECT_ADDRESS);
    console.log(`onWhiteList is ${onWhiteList}`);
    
    if(onWhiteList == false){
        console.log('adding to whitelist');

        const tx1 = await rabbitCatchMaster.updateWhitelist(process.env.SUBJECT_ADDRESS, true);
        await tx1.wait();
        onWhiteList = await rabbitCatchMaster.whitelist(process.env.SUBJECT_ADDRESS);
        console.log(`afer update onWhiteList is ${onWhiteList}`);
    }
    
}
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});
  