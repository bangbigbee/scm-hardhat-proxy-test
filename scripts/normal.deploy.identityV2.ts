// scripts/deploy.js
import { ethers } from "hardhat"

async function main() {

  const IdentityManagerVTwo = await ethers.getContractFactory("IdentityManagerVTwo");
  const identityMnagerTwo = await IdentityManagerVTwo.deploy();
  await identityMnagerTwo.deployed()
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
}
