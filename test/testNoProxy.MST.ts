// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers } from "hardhat"
import { Contract, BigNumber } from "ethers"
import { Address } from "cluster";
import { sign } from "crypto";
import { id } from "ethers/lib/utils";

describe("IdentityManager", function () {
  let identityManager:Contract;
  enum ObjType {USER, OWNER, ADMIN, SYSADDR}
  let owner: any;
  // MULTI-SIGN TRANSACTION CODE
  const AddTx    = 1;
  const TransTx  = 2;
  const DeactTx  = 3;
  const ActTx    = 4;

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
    await identityManager.initialize(initialOwners);
    await identityManager.ownerList_(initialOwners[0]);
    await identityManager.ownerList_(initialOwners[1]);
    await identityManager.ownerList_(initialOwners[2]);
    await identityManager.ownerList_(initialOwners[3]);
  })

  // Test submit TRANSFER OWNER
  it("should submit a TRANSFER with multi-sign transaction", async function () {
    const txCode = TransTx; 
    const objType = ObjType.OWNER
    const fromAddr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const toAddr = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; 
    const objMST = await identityManager.submitMST(txCode, objType, fromAddr, toAddr);
    // Check if the event was emitted
    expect(objMST).to.emit(identityManager, "mstSubmitted").withArgs(owner.address, identityManager.MSTList_.length);
    // Check the MST information
    let mstInfo = await identityManager.getMSTInfo(1);
    expect(mstInfo[0]).to.equal(TransTx);  // txCode;
    expect(mstInfo[1]).to.equal(ObjType.OWNER);
    expect(mstInfo[2]).to.equal("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    expect(mstInfo[3]).to.equal("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199");    
    expect(mstInfo[6]).to.be.false;
    // Sign a submitted transaction
    const txId = 1; // transfer an owner:
    // from "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    // to   "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
    const signedObj = await identityManager.signSubmittedMST(txId);
    // Check if the MST was signed
    expect(signedObj).to.emit(
    identityManager, "MSTSigned").withArgs(owner.address, txId);
    // Check the number of signatures
    mstInfo = await identityManager.getMSTInfo(txId);
    expect(mstInfo[7]).to.equal(1);
    // Revoke
    const revokedObj = await identityManager.revokeSignature(txId);
    expect(revokedObj).to.emit(
      identityManager, "signatureRevoked").withArgs(owner.address, txId);
    // Check the number of signatures
    mstInfo = await identityManager.getMSTInfo(txId);
    expect(mstInfo[7]).to.equal(0);
  });
// Test ADD an OWNER with MST
  it("should submit >> sign >> execute ADD OWNER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const objType = ObjType.OWNER
    const fromAddr = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const toAddr = "0x0000000000000000000000000000000000000000"; 
  // Submit ADD OWNER
    const signer0 = await identityManager.connect(signers[0]).submitMST(txCode, objType, fromAddr, toAddr);
    // Check if the event was emitted
    expect(signer0).to.emit(identityManager, "mstSubmitted").withArgs(signer0.address, identityManager.getMSTCounter());
    // Check the returned object information
    let txId = identityManager.getMSTCounter();
    let mstInfo = await identityManager.getMSTInfo(txId);
    expect(mstInfo[0]).to.equal(AddTx); 
    expect(mstInfo[1]).to.equal(ObjType.OWNER);
    expect(mstInfo[2]).to.equal("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199");
    expect(mstInfo[6]).to.be.false; // isExecuted
    expect(mstInfo[7]).to.equal(0); // signature counter
    // Check the length of MSTList_
    const length = await identityManager.getMSTCounter();
    expect(length).to.equal(1);

  // Sign a submitted ADD OWNER MST
    txId = 1; // txId of ADD OWNER "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
    const signObj = await identityManager.connect(signers[0]).signSubmittedMST(txId);
    // Check if the MST was signed
    expect(signObj).to.emit(
      identityManager, "MSTSigned").withArgs(signers[0].address, txId);
    // Check the number of signatures
    mstInfo = await identityManager.getMSTInfo(txId);
    expect(mstInfo[7]).to.equal(1);

  // Execute a MST ADD - WHEN NOT ENOUGH REQUIRED SIGNATURES
    await expect(identityManager.connect(signers[0]).executeMST(txId)).to.be.revertedWith(
      "The number of signatures is not enough to execute this transaction");
    mstInfo = await identityManager.getMSTInfo(txId);
    expect(mstInfo[6]).to.be.false; // isExecuted
    // get more signatures 
    await identityManager.connect(signers[1]).signSubmittedMST(txId);
    await identityManager.connect(signers[2]).signSubmittedMST(txId);
    await identityManager.connect(signers[3]).signSubmittedMST(txId);    
    const result = await identityManager.connect(signers[0]).executeMST(txId);
    // expect(result).to.equal(true);
    // check if the transaction was successfully executed
    mstInfo = await identityManager.getMSTInfo(txId);
    expect(mstInfo[6]).to.equal(true);
    expect(mstInfo[7]).to.equal(4);
    // check if the event was emitted
    expect(identityManager).to.emit(
      identityManager, "MSTExecuted").withArgs(signers[0].address, txId);
  });
// Test ADD a USER with MST
  it("should not accept ADD USER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const objType = ObjType.USER
    const fromAddr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
    const toAddr = "0x0000000000000000000000000000000000000000"; 
    await expect(identityManager.submitMST(txCode, objType, fromAddr, toAddr)).to.be.revertedWith(
      "No need to add user with MST");
  });
  // Test ADD a SYSADDR with MST
  it("should not accept ADD SYSTEM with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const objType = ObjType.SYSADDR
    const fromAddr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
    const toAddr = "0x0000000000000000000000000000000000000000"; 
    await expect(identityManager.submitMST(txCode, objType, fromAddr, toAddr)).to.be.revertedWith(
      "No need to add system address with MST");
  });
  // Test TRANSFER a SYSADDR with MST
  it("should TRANSFER SYSADDR with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = TransTx; 
    const objType = ObjType.SYSADDR
    const fromAddr = "0x60Dc2c9dd7bF5a5D2593D01B01206a7be9a0077F";
    const toAddr = "0x0000000000000000000000000000000000000000"; 
    await identityManager.submitMST(txCode, objType, fromAddr, toAddr);
    // Emit
    expect(identityManager).to.emit(
      identityManager, "MSTSubmitted").withArgs(signers[0].address, identityManager.getMSTCounter());
    // Get MST info
    const mstInfo = await identityManager.getMSTInfo(identityManager.getMSTCounter());
    expect(mstInfo[0]).to.equal(TransTx);
    expect(mstInfo[1]).to.equal(ObjType.SYSADDR);
    expect(mstInfo[7]).to.equal(0);

  });

  // Test ACTIVATE USER with MST
  it("should submit >> sign >> execute ACTIVATE USER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    
  // First we test register user with signer[5] 
    await identityManager.connect(signers[5]).registerUser("User5");
  // Check if event emitted
    expect(identityManager).to.emit(
    identityManager, "userRegistered").withArgs(signers[5].address);
  // Check if user registered successfully
    const objInfo =  await identityManager.userList_(signers[5].address);
    expect(objInfo.objectId).to.equal("User5");
    expect(objInfo.isActive).to.equal(false);

  // Submit an ACTI USER with MST  
    const txCode = ActTx; 
    const objType = ObjType.USER
    const fromAddr = signers[5].address;
    const toAddr = "0x0000000000000000000000000000000000000000"; 
    const testActi = await identityManager.connect(signers[0]).submitMST(txCode, objType, fromAddr, toAddr)
    const txIdActi = identityManager.getMSTCounter();
    // Check if event emitted
    expect(identityManager).to.emit(
    identityManager, "MSTSubmitted").withArgs(signers[0].address, txIdActi);
    // Get MST info
    const mstInfo = await identityManager.getMSTInfo(identityManager.getMSTCounter());
    // Check if MST has been successully submitted
    expect(mstInfo.txCode).to.equal(ActTx);
    expect(mstInfo.objType).to.equal(ObjType.USER);

  // Submit one more DEACTIVE USER with MST  
    const txIdDeact = identityManager.getMSTCounter();
    const txCode1 = DeactTx; 
    const objType1 = ObjType.USER
    const fromAddr1 = signers[5].address;
    const toAddr1 = "0x0000000000000000000000000000000000000000"; 
    await identityManager.connect(signers[1]).submitMST(txCode1, objType1, fromAddr1, toAddr1)
    // Check if event emitted
    expect(identityManager).to.emit(
    identityManager, "MSTSubmitted").withArgs(signers[1].address, txIdDeact);
    // Get MST info
    const mstInfo1 = await identityManager.getMSTInfo(txIdDeact);
    // Check if MST has been successully submitted
    expect(mstInfo1.txCode1).to.equal(DeactTx);
    expect(mstInfo1.objType1).to.equal(ObjType.USER);
    // Check length of MSTList_
    expect(identityManager.getMSTCounter()).to.equal(2);
  
  // Sign ACTI USER with MST
  const signObj = await identityManager.connect(signers[0]).signSubmittedMST(txIdActi);
  // Check if the MST was signed
  expect(signObj).to.emit(
    identityManager, "MSTSigned").withArgs(signers[0].address, txIdActi);
  // Check the number of signatures
  const mstInfo2 = await identityManager.getMSTInfo(txIdActi);
  expect(mstInfo2[7]).to.equal(1);

// Execute a MST ADD - WHEN NOT ENOUGH REQUIRED SIGNATURES
  await expect(identityManager.connect(signers[0]).executeMST(txIdActi)).to.be.revertedWith(
    "The number of signatures is not enough to execute this transaction");
  const mstInfo3 = await identityManager.getMSTInfo(txIdActi);
  expect(mstInfo3[6]).to.be.false; // isExecuted
  // get more signatures 
  await identityManager.connect(signers[1]).signSubmittedMST(txIdActi);
  await identityManager.connect(signers[2]).signSubmittedMST(txIdActi); 
  const result = await identityManager.connect(signers[2]).executeMST(txIdActi);
  // expect(result).to.equal(true);
  // check if the transaction was successfully executed
  const mstInfo4 = await identityManager.getMSTInfo(txIdActi);
  expect(mstInfo4[6]).to.equal(true);
  expect(mstInfo4[7]).to.equal(3);
  // check if the event was emitted
  expect(identityManager).to.emit(
    identityManager, "MSTExecuted").withArgs(signers[2].address, txIdActi);
     
  });
})