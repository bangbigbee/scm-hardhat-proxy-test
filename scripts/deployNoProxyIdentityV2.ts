// scripts/deploy.js
import { ethers } from "hardhat"

async function main() {

  const IdentityManagerVTwo = await ethers.getContractFactory("IdentityManagerVTwo");
  const identityMnagerTwo = await IdentityManagerVTwo.deploy();
  await identityMnagerTwo.deployed();
  console.log("Successully deploy at: ",identityMnagerTwo.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
