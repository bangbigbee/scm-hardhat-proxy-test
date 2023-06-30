// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers } from "hardhat"
import { Contract, BigNumber } from "ethers"
import { Address } from "cluster";
import { sign } from "crypto";
import { id } from "ethers/lib/utils";

describe("IdentityManager", function () {
  let identityManager:Contract;
  let owner: any;
  // Object role code
  const USER        = 1;
  const OWNER       = 2;
  const ADMIN       = 3;
  const SYSTEM      = 4;
  // Multi-sign transaction code
  const AddTx       = 5;
  const DeactivTx   = 6;
  const ActivTx     = 7;
 
  beforeEach(async function () {
    // console.log("Msg.sender: ", owner.address);
    // console.log("Contract deployed at: ", identityManager.address);
    [owner] = await ethers.getSigners();
    const IdentityManager = await ethers.getContractFactory("IdentityManager")
    identityManager = await IdentityManager.deploy() // Note: normal deployment
    await identityManager.deployed()
    
    const initialOwners = [
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906"];
    await identityManager.initializeSystem(initialOwners);
    await identityManager.objList_(initialOwners[0]);
    await identityManager.objList_(initialOwners[1]);
    await identityManager.objList_(initialOwners[2]);
    await identityManager.objList_(initialOwners[3]);
  })

// Test ADD an OWNER with MST
  it("should submit >> sign >> execute ADD OWNER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const role = OWNER;
    const addr = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  // Submit ADD OWNER
    const signer0 = await identityManager.connect(signers[0]).submitMST(txCode, role, addr);
    const txIdAdd = identityManager.getMSTCounter();
    // Check if the event was emitted
    expect(signer0).to.emit(identityManager, "mstSubmitted").withArgs(signer0.address, txIdAdd);
    // Check the returned object information
    let mstInfo = await identityManager.getMSTInfo(txIdAdd);
    expect(mstInfo[0]).to.equal(AddTx); 
    expect(mstInfo[1]).to.equal(OWNER);
    expect(mstInfo[2]).to.equal("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199");
    expect(mstInfo[5]).to.be.false; // isExecuted
    expect(mstInfo[6]).to.equal(0); // signature counter

  // Sign a submitted ADD OWNER MST
    const signObj = await identityManager.connect(signers[0]).signSubmittedMST(txIdAdd);
    // Check if the MST was signed
    expect(signObj).to.emit(
      identityManager, "MSTSigned").withArgs(signers[0].address, txIdAdd);
    // Check the number of signatures
    mstInfo = await identityManager.getMSTInfo(txIdAdd);
    expect(mstInfo[6]).to.equal(1);

  // Execute a MST ADD OWNER - WHEN NOT ENOUGH REQUIRED SIGNATURES
    await expect(identityManager.connect(signers[0]).executeMST(txIdAdd)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    mstInfo = await identityManager.getMSTInfo(txIdAdd);
    expect(mstInfo[5]).to.be.false; // isExecuted
    // get more signatures 
    await identityManager.connect(signers[1]).signSubmittedMST(txIdAdd);
    await identityManager.connect(signers[2]).signSubmittedMST(txIdAdd);
    await identityManager.connect(signers[3]).signSubmittedMST(txIdAdd);    
    await identityManager.connect(signers[0]).executeMST(txIdAdd);
    // expect(result).to.equal(true);
    // check if the transaction was successfully executed
    mstInfo = await identityManager.getMSTInfo(txIdAdd);
    expect(mstInfo[5]).to.equal(true);
    expect(mstInfo[6]).to.equal(4);
    // check if the event was emitted
    expect(identityManager).to.emit(
      identityManager, "MSTExecuted").withArgs(signers[0].address, txIdAdd);
  });

// ADD a USER with MST
  it("should not accept ADD USER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const role = USER;
    const addr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
    await expect(identityManager.submitMST(txCode, role, addr)).to.be.revertedWith(
      "signSubmittedMST: No need MST to add user");
  });
  // Test ADD a SYSTEM with MST
  it("should not accept ADD SYSTEM with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const role = SYSTEM
    const addr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
    await expect(identityManager.submitMST(txCode, role, addr)).to.be.revertedWith(
      "signSubmittedMST: No need MST to add system address");
  });
    // Test ADD ADMIN with MST
    it("should not accept ADD ADMIN with multi-sign transaction", async function () {
      const signers = await ethers.getSigners();
      const txCode = AddTx; 
      const role = ADMIN
      const addr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
      await expect(identityManager.submitMST(txCode, role, addr)).to.be.revertedWith(
        "signSubmittedMST: No need MST to add admin");
    });
  
    // Test ACTIVATE USER with MST
  it("should submit >> sign >> execute ACTIVATE USER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    
  // First we test register user with signer[5] 
    await identityManager.connect(signers[5]).addUserWallet("User5", "CCCD", "12345asd2");
  // Check if event emitted
    expect(identityManager).to.emit(
    identityManager, "userWalletAdded").withArgs(signers[5].address);
  // Check if user registered successfully
    const objInfo =  await identityManager.objList_(signers[5].address);
    expect(objInfo.name).to.equal("User5");
    expect(objInfo.isActive).to.equal(false);

  // Submit an ACTI USER with MST  
    const txCode = ActivTx; 
    const role = USER
    const addr = signers[5].address;
    await identityManager.connect(signers[0]).submitMST(txCode, role, addr)
    const txIdActi = identityManager.getMSTCounter();
    // Check if event emitted
    expect(identityManager).to.emit(
    identityManager, "MSTSubmitted").withArgs(signers[0].address, txIdActi);
    // Get MST info
    const mstInfo = await identityManager.getMSTInfo(identityManager.getMSTCounter());
    // Check if MST has been successully submitted
    expect(mstInfo.txCode).to.equal(ActivTx);
    expect(mstInfo.role).to.equal(USER);

  // Meanwhile, submit DEACTIVE USER with MST  
    const txCodeDeact = DeactivTx; 
    const roleDeact = USER
    const addrDeact = signers[5].address;
    await identityManager.connect(signers[1]).submitMST(txCodeDeact, roleDeact, addrDeact)
    const txIdDeact = identityManager.getMSTCounter(); // save the txId of DEACTI USER of signers[5].address
    // Check if event emitted
    expect(identityManager).to.emit(
    identityManager, "MSTSubmitted").withArgs(signers[1].address, txIdDeact);
    // Get MST info
    const mstDeact = await identityManager.getMSTInfo(txIdDeact);
    // Check if MST has been successully submitted
    expect(mstDeact[0]).to.equal(txCodeDeact);
    expect(mstDeact[1]).to.equal(roleDeact);
    // Check length of MSTList_
    expect(await identityManager.getMSTCounter()).to.equal(2);
  
    // Now we have 2 MST, but we sign ACTI USER fist 
    const signObj = await identityManager.connect(signers[0]).signSubmittedMST(txIdActi);
    // Check if the MST was signed
    expect(signObj).to.emit(
      identityManager, "MSTSigned").withArgs(signers[0].address, txIdActi);
    // Check the number of signatures
    const mstActiInfo = await identityManager.getMSTInfo(txIdActi);
    expect(mstActiInfo[6]).to.equal(1);

  // Execute a MST ACTIVATE USER - when not enough signatures
    await expect(identityManager.connect(signers[0]).executeMST(txIdActi)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    const mstActiInfo_ = await identityManager.getMSTInfo(txIdActi);
    expect(mstActiInfo_[5]).to.be.false; // isExecuted is expected to be false
    
    // let's get more signatures 
    await identityManager.connect(signers[1]).signSubmittedMST(txIdActi);
    await identityManager.connect(signers[2]).signSubmittedMST(txIdActi); 
    // let an owner sign existing transaction one more time
    await expect(identityManager.connect(signers[1]).signSubmittedMST(txIdActi)).to.be.revertedWith(
      "Already signed")
     // Execute a MST ACTIVATE USER - WHEN ENOUGH REQUIRED SIGNATURES 
    await identityManager.connect(signers[0]).executeMST(txIdActi);
    // check if the transaction was successfully executed
    const mstInfoExe = await identityManager.getMSTInfo(txIdActi);
    expect(mstInfoExe[5]).to.equal(true); // isExecuted to be true
    expect(mstInfoExe[6]).to.equal(3); // got 3 signatures
    // check if the event was emitted
    expect(identityManager).to.emit(identityManager, "MSTExecuted").withArgs(signers[0].address, txIdActi);
 
    // Continue to sign DEACTI USER
    const signDeactObj = await identityManager.connect(signers[0]).signSubmittedMST(txIdDeact);
    // Check if the MST was signed
    expect(signDeactObj).to.emit(
      identityManager, "MSTSigned").withArgs(signers[0].address, txIdDeact);
    // Check the number of signatures
    const mstInfoDeacti = await identityManager.getMSTInfo(txIdDeact);
    expect(mstInfoDeacti[6]).to.equal(1);
    // Execute a DEACTIVATE USER - when not enough signatures
    await expect(identityManager.connect(signers[0]).executeMST(txIdDeact)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    const mstInfoDeacti_ = await identityManager.getMSTInfo(txIdDeact);
    expect(mstInfoDeacti_[5]).to.be.false; // isExecuted is expected to be false  
    
    // let's get more signatures 
    await identityManager.connect(signers[1]).signSubmittedMST(txIdDeact);
    await identityManager.connect(signers[2]).signSubmittedMST(txIdDeact); 
    // then two signers revoke their signatures
    await identityManager.connect(signers[1]).revokeSignature(txIdDeact); 
    await identityManager.connect(signers[2]).revokeSignature(txIdDeact);
    // check if the transaction was successfully executed
    await expect(identityManager.connect(signers[0]).executeMST(txIdDeact)).to.be.revertedWith(
      "Not enough signatures to execute transaction");
    // check more details
    const mstInfoDeactiv = await identityManager.getMSTInfo(txIdDeact);
    expect(mstInfoDeactiv[5]).to.equal(false); // isExecuted to be false
    expect(mstInfoDeactiv[6]).to.equal(1); // got 2 signatures
  
    // now 2 owners re-sign and execute MST again
    await identityManager.connect(signers[1]).signSubmittedMST(txIdDeact); 
    await identityManager.connect(signers[2]).signSubmittedMST(txIdDeact);
    await identityManager.connect(signers[0]).executeMST(txIdDeact);
    // Check if MST executed
    const mstInfoDeactiv_ = await identityManager.getMSTInfo(txIdDeact);
    expect(mstInfoDeactiv_[5]).to.equal(true); // isExecuted to be true
    expect(mstInfoDeactiv_[6]).to.equal(3); // got 3 signatures
    // check if the event was emitted
    expect(identityManager).to.emit(identityManager, "MSTExecuted").withArgs(signers[0].address, txIdDeact);
   });
})