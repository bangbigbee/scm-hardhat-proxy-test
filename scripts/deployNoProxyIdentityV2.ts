// scripts/deploy.js
import { ethers } from "hardhat"

async function main() {

  const IdentityManager_Two = await ethers.getContractFactory("IdentityManager_Two");
  const identityMnagerTwo = await IdentityManager_Two.deploy();
  await identityMnagerTwo.deployed();
  console.log("Successully deploy at: ",identityMnagerTwo.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
