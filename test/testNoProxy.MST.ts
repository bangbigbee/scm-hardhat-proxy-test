// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers } from "hardhat"
import { Contract, BigNumber } from "ethers"
import { Address } from "cluster";

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

  // Submit a multi-sign transactions
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

  it("should submit >> sign >> execute ADD OWNER with multi-sign transaction", async function () {
    const signers = await ethers.getSigners();
    const txCode = AddTx; 
    const objType = ObjType.OWNER
    const fromAddr = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const toAddr = "0x0000000000000000000000000000000000000000"; 
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
})