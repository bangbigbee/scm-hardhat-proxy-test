// This test is to test Identiy Manager V1 without Proxy
import { expect } from "chai";
import { ethers } from "hardhat"
import { Contract, BigNumber } from "ethers"
import { Address } from "cluster";

describe("IdentityManager", function () {
  let identityManager:Contract;
  enum ObjType {USER, OWNER, ADMIN, SYSADDR}
  let owner: any;
  // Object role code
  const USER        = 1;
  const OWNER       = 2;
  const ADMIN       = 3;
  const SYSTEM      = 4;

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
  
  it("should add new ADMIN", async function () {
    const adminAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128";
    const role = ADMIN;
    const name = "Admin1";
    const idType = "CCCD";
    const idValue = "1239456AB32";
    const tx = await identityManager.addObject(adminAddr, role, name, idType, idValue);
    // Check if the event was emitted
    expect(tx).to.emit(identityManager, "adminAdded").withArgs(owner.address, adminAddr);
    // Check if the admin was added successfully
    const adminObject = await identityManager.ownerList_(adminAddr);
    expect(adminObject.isActive).to.be.true;
    // Check if admin counter works
    const adminCounter = await identityManager.getActiveObjCounter(role);
    expect(adminCounter).to.equal(1);
  })
  
  it("should get object information for a ADMIN object", async function () {
    const adminObject = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128"; 
    const objType = ObjType.ADMIN; 
    const objInfo = await identityManager.getObjectInfo(adminObject, objType);
    // Check the returned object information
    expect(objInfo[0]).to.equal("Admin1");  // objectId value
    expect(objInfo[1]).to.be.true;          // isActive value
    expect(objInfo[2]).to.be.false;         // isKYC value
  });
  it("should update object information for a ADMIN object", async function () {
    const objAddr = "0xC6078d3f4803B24a51460e57AE76EF6f5447C128"; 
    const objType = ObjType.ADMIN;
    const objId   = "AdminSuper1"; 
    const objIsKYC= true;
    const objInfo = await identityManager.updateObjectInfo(objAddr, objType, objId, objIsKYC );
    // Check if the event was emitted
    expect(objInfo).to.emit(identityManager, "adminUpdated").withArgs(owner.address, objAddr);
    // Check the returned object information
    const objInfoGet = await identityManager.getObjectInfo(objAddr, objType);
    expect(objInfoGet[0]).to.equal("AdminSuper1");  // objectId value
    expect(objInfoGet[1]).to.be.true;          // isActive value
    expect(objInfoGet[2]).to.be.true;         // isKYC value
  });

})