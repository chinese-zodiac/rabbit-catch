
const {ethers} = require("hardhat");
const fs = require('fs'); 
const {parse} = require('csv-parse');
const path = require('path');
const { finished } = require('stream/promises');
const timersPromises = require('timers/promises');

const { parseEther, formatEther, defaultAbiCoder } = ethers.utils;

const LUCKYRABBITTOKEN = "0xE95412D2d374B957ca7f8d96ABe6b6c1148fA438";
const LRTPATCH = "0x8050437A017E145b585896B6E1Fd163f4AC87e1e";


async function main() {
  const [deployer] = await ethers.getSigners();

  const luckyRabbitToken =  await ethers.getContractAt("LuckyRabbitToken", LUCKYRABBITTOKEN);
  const lrtPatch =  await ethers.getContractAt("LRTPatch", LRTPATCH);

  console.log("Getting csv..")
  let accounts = [];
  const parser = fs
    .createReadStream(path.join(__dirname, "holders.csv"))
    .pipe(parse({}));
  parser.on('readable', function(){
    let record; while ((record = parser.read()) !== null) {
    // Work with each record
      accounts.push(record[0]);
    }
  });
  await finished(parser);
  accounts.shift();
  let balCalls = []
  let trackedCalls = []
  let hasWonCalls = []

  accounts.forEach((account,index)=>{
    balCalls.push(
      luckyRabbitToken.balanceOf(account)
    );
  });
  const balances = await Promise.all(balCalls);
  console.log("Got balances");

  accounts.forEach((account,index)=>{
    trackedCalls.push(
      lrtPatch.getTrackedAddressIndex(account)
    );
  });
  const trackedIndex = await Promise.all(trackedCalls);
  console.log("Got trackedindex");

  accounts.forEach((account,index)=>{
    hasWonCalls.push(
      lrtPatch.addressHasWon(account)
    );
  });
  const hasWon = await Promise.all(hasWonCalls);
  console.log("Got haswon");


  console.log("Finding address to track...");
  let toTrack = [];
  accounts.forEach((account,index)=>{
    //console.log("Haswon",hasWon[index]);
    //console.log("Bal",balances[index].gte(parseEther("1")),formatEther(balances[index]));
    //console.log("Tracking",trackedIndex[index].eq("0"),trackedIndex[index].toString());
    if(trackedIndex[index].eq("-1")) {
      console.log("Found untracked address",account,hasWon[index],trackedIndex[index].toString(),Math.floor(Number(formatEther(balances[index]))))
    }
    if(!hasWon[index] && balances[index].gte(parseEther("1")) && trackedIndex[index].eq("-1")) {
      console.log("Adding:",account);
      toTrack.push()
    }
  })
  if(toTrack.length > 0) {
    console.log("Calling track..");
    let tx = await lrtPatch.trackAddresses(toTrack);
    await tx.wait();
  } else {
    console.log("Nothing new to track.")
  }

  console.log("Updating addresses...")
  const trackedAddressCount = await lrtPatch.getTrackedAddressCount();
  await timersPromises.setTimeout(1000); //reduce likelyhood of duplicate nonces by waiting 1s
  let tx = await lrtPatch.updateAccounts(0,trackedAddressCount);
  await tx.wait();
  console.log("Success.");


}


  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});