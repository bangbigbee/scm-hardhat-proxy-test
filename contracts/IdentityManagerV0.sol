


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 

interface iIdentityManager_zero {

// Manage proxy
  function initialize(address[] memory _initialOwners) external;
  function pauseSystem() external returns (bool);
  function unpauseSystem() external returns (bool);

// Manage objects
  enum ObjType {USER, OWNER, ADMIN, SYSADDR}
  function registerUser(string calldata _profileId) external returns (bool); 
  function addObject(
    address _addr, 
    ObjType _objType, 
    string memory objectId) external returns (bool); 
  function deactivateObject(address _addr, ObjType _objType) external returns (bool); 
  function activateObject (address _addr, ObjType _objType) external returns (bool); 
  function updateObjectInfo( 
    address         _objAddr,
    ObjType         _objType,
    string memory   _objId, 
    bool            _isKYC) external returns (bool);
  function transferObject(address _fromAdmin, address _toAdmin, ObjType objectType) external returns (bool);
  function getObjectInfo(address _userAddr, ObjType _objType) external returns(
    string memory   _objId, 
    bool            _isActive, 
    bool            _isKYC
    );
  function isAccountTradable(address _addr) external view returns (bool);
  function getObjectCounter(ObjType _objType) external returns (uint userCount);
  function isObjectExisting(address _addr, ObjType _objType) external view returns (bool);

// Manage multi-sign transactions
  function submitMST(uint32 _txCode, address _from, address _to) external returns (bool);
  function signSubmittedMST(uint _txId) external returns (bool);
  function revokeSignature(uint _txId) external returns (bool);
  function executeMST(uint _txId, ObjType _objType) external returns (bool); 
  function getMSTCounter() external view returns (uint);
  function getMSTInfo(uint _txId) external view returns (
    uint32    _txCode,
    address   _from,
    address   _to,
    uint256   _creationTime,
    uint256   _executionTime,
    bool      _isExecuted,
    uint256   _signatureCount);
// ==================================== EVENT =================================================
// Proxy 
  event systemPaused (address indexed owner);
  event systemUnpaused (address indexed owner);
// Multi-sign transactions
  event MSTSubmited(address indexed owner,uint indexed txId);
  event MSTSigned(address indexed owner, uint indexed txId);
  event signatureRevoked(address indexed owner, uint indexed txId);
  event MSTExecuted(address indexed owner, uint indexed txId);
// Owner
  event ownerAdded(address indexed newOwner);
  event ownerDeactivated(address indexed deactivatedOwner);
  event ownerActivated(address indexed activatedOwner);
  event ownerUpdated(address indexed updatingOwner, address indexed updatedOwner);
  event ownerTransfered(address indexed fromOwner, address indexed toOwner);
// User
  event userRegistered(address indexed newUser);
  event userDeactivated(address indexed adminAccount, address indexed deactivatedUser);
  event userActivated(address indexed adminAccount, address indexed activatedUser);
  event userUpdated(address indexed adminAccount, address indexed updatedUser);
// Admin
  event adminAdded(address indexed account, address indexed newAdmin);
  event adminDeactivated(address indexed ownerAccount, address indexed adminAccount);
  event adminActivated(address indexed ownerAccount, address indexed adminAccount);
  event adminUpdated(address indexed ownerAccount, address indexed adminAccount);
  event adminTransfered(address indexed fromAdmin, address indexed toAdmin);
// System address
  event sysAddrAdded(address indexed adminAccount, address indexed newSysAddr);
  event sysAddrActivated(address indexed adminAccount, address indexed sysAddr);
  event sysAddrDeactivated(address indexed adminAccount, address indexed sysAddr);
  event sysAddrUpdated(address indexed adminAccount, address indexed sysAddr);
  event sysAddrRevoked(address indexed adminAccount, address indexed sysAddr);
  event sysAddrTransfered(address indexed fromAddr, address indexed toAddr);
}


contract IdentityManager_Zero is iIdentityManager_zero {

  // PROXY
  bool public initialized;    // initialization state of smart contract
  bool public paused;         // pause/unpause the system 

  // MULTI-SIGN TRANSACTION CODE
    uint8 public constant AddTx    = 1;
    uint8 public constant TransTx  = 2;
    uint8 public constant DeactTx  = 3;
    uint8 public constant ActTx    = 4;

  // OBJECT
  struct _obj{
    string      objectId;
    ObjType     objectType;
    bool        isActive;
    bool        isKYC;
  }
  
  // MANAGE USERS    
  uint private userCounter;    
  mapping(address => _obj) public userList_;    
  
  // MANAGE ADMIN     
  uint private adminCounter;
  mapping(address => _obj) public adminList_;  
  
  // MANAGE OWNER 
  uint private ownerCounter;                     
  mapping(address => _obj) public ownerList_;  

  // MANAGE SYSTEM ADDRESSES  
  uint private sysAddrCounter;                   
  mapping(address => _obj) public sysAddrList_; 
  
  // Manage multi-sign transactions 
  uint32 private constant MST_TIMEOUT = 1800;        // MST timeout: 30 minutes = 1800 seconds
  uint32 private constant MIN_SIG_REQUIRED = 3;      // minimum of signature required per MST
  uint public numSigReqMST;                          // the number of signatures required for MST 
  struct _MST {            
      uint32  txCode;        
      address from;
      address to;
      uint256 creationTime;
      uint256 executionTime;
      bool    isExecuted;
      uint    signatureCount;
  }
  mapping(uint => mapping(address => bool)) public isMSTSigned_; 
  _MST[] private MSTList_; 
  
  // MODIFIER
  modifier initializer() {
      require(!initialized, "Contract is already initialized");
      _;}
  modifier onlyOwner() {
      require(ownerList_[msg.sender].isActive, "You are not authorized as the owner!");
      _; }
  modifier onlyAdmin() {
    require(adminList_[msg.sender].isActive || ownerList_[msg.sender].isActive, "You are not authorized as an admin!");
      _; }

  modifier isTxExisting(uint _txId) {
      require(_txId < MSTList_.length, "The transaction does not exist");
      _; }
  modifier isTxNotExecutedYet(uint _txId) {
      require(!MSTList_[_txId].isExecuted, "The transaction have already executed");
      _; }
  modifier iHaveNotSigned(uint _txId) {
      require(!isMSTSigned_[_txId][msg.sender], "You have already signed");
      _; }
  modifier iHaveSigned(uint _txId) {
      require(isMSTSigned_[_txId][msg.sender], "You have not signed");
      _; }
  modifier isExecutionTimeOut(uint _txId) {
      require(
        (block.timestamp - MSTList_[_txId].creationTime) <= MST_TIMEOUT,
        "Timeout, execution is only valid for less than 30 minutes from the creation time");
      _; }
  modifier whenUnpaused() {
    require(!paused, "Asset has been paused");
    _; }
  modifier whenPaused() {
    require(paused, "Asset has not been paused");
    _; }

// =====================================================================================================================
  constructor() {
  }
// ================================= PROXY ======================================
  function initialize(address[] memory _initialOwners) public initializer { 
    require(_initialOwners.length >= MIN_SIG_REQUIRED,"It is required at least 3 owners to initialize system!");
    ownerCounter = 0;
    adminCounter = 0;
    for (uint i = 0; i < _initialOwners.length; i++) {
            address owner = _initialOwners[i];
            require(owner != address(0), "Invalid owner");
            require(!ownerList_[owner].isActive, "The owner already exists");
            ownerList_[owner] = _obj("N/A", ObjType.OWNER, true, true );
            ownerCounter ++;
            emit ownerTransfered(address(0), owner);
        }
    numSigReqMST = ownerCounter/2 + 1;
    initialized = true;
  }
  function pauseSystem() external onlyOwner whenUnpaused returns (bool) {
    paused = true;
    emit systemPaused(msg.sender);
    return true;
  }
  function unpauseSystem() external onlyOwner whenPaused returns (bool) {
    paused = false;
    emit systemUnpaused(msg.sender);
    return true;
  }

// ====================== MANAGE OBJECTS WITH MULTI-SIGN TRANSACTIONS ==========================
function submitMST(
  uint32 _txCode, 
  address _from, 
  address _to) public onlyOwner returns (bool){
      require(_txCode <= 3, "Transaction code does not exists");
      uint txIndex = MSTList_.length;
      if(_txCode == 0) _from = address(0);
      if(_txCode == 2)_to = address(0);
      MSTList_.push(
          _MST({
              txCode:         _txCode,
              from:           _from,
              to:             _to,            
              creationTime:   block.timestamp,
              executionTime:  0,
              isExecuted:     false,
              signatureCount: 0
          })
      );
      emit MSTSubmited(msg.sender, txIndex);
      return true;
  }

  function signSubmittedMST(uint _txId) public
      onlyOwner
      isTxExisting(_txId)
      isTxNotExecutedYet(_txId)
      iHaveNotSigned(_txId)
      isExecutionTimeOut(_txId)
      returns (bool) {
        _MST storage mst = MSTList_[_txId];
        mst.signatureCount += 1;
        isMSTSigned_[_txId][msg.sender] = true;
        emit MSTSigned(msg.sender, _txId);
        return true;
      }

  function revokeSignature(uint _txId)
      public
      onlyOwner
      isTxExisting(_txId)
      isTxNotExecutedYet(_txId)
      iHaveSigned(_txId)
      isExecutionTimeOut(_txId)
      returns (bool)
  {
      _MST storage mst = MSTList_[_txId];
      mst.signatureCount -= 1;
      isMSTSigned_[_txId][msg.sender] = false;
      emit signatureRevoked(msg.sender, _txId);
      return true;
  }

  function executeMST(uint _txId, ObjType _objType) public
      onlyOwner
      isTxExisting(_txId)
      isTxNotExecutedYet(_txId)
      isExecutionTimeOut(_txId)
      returns (bool){
      _MST storage mst = MSTList_[_txId];
      require(
      mst.signatureCount >= numSigReqMST,
      "The number of signatures is not enough to execute this transaction"
      );
      mst.isExecuted = true;
      if(mst.txCode == AddTx){
        _addObject(mst.to, _objType);
      }
      else if(mst.txCode == TransTx){
        _transferObject(mst.from, mst.to, _objType);
      }
      else if(mst.txCode == DeactTx){
        _deactivateObject(mst.from, _objType);
      }
      else if(mst.txCode == ActTx){
        _activateObject(mst.from, _objType);
      }
      else{
        return false;
      }
      emit MSTExecuted(msg.sender, _txId);
      return true;
  }

  function getMSTCounter() public view onlyOwner returns (uint) {
      return MSTList_.length;
  }

  function getMSTInfo(uint _txId) public view onlyOwner returns (
        uint32 txCode,
        address from,
        address to,
        uint256 creationTime,
        uint256 executionTime,
        bool isExecuted,
        uint256 signatureCount){
      require(_txId < MSTList_.length, "Transaction does not exists");
      _MST memory mst = MSTList_[_txId];      
      return (
        mst.txCode,
        mst.from,
        mst.to,
        mst.creationTime,
        mst.executionTime,
        mst.isExecuted,
        mst.signatureCount
      );
  }
// ================================ internal functions =======================================
function _addObject(address _theObj, ObjType _objType) internal returns (bool){
    // Check if input address is valid
    require(_theObj != address(0), "Invalid object!");
    require(_objType == ObjType.ADMIN ||
            _objType == ObjType.OWNER, 
            "Object type is invalid!");
    if(_objType == ObjType.OWNER) {
    //@dev Add owner to the contract
    require(!ownerList_[_theObj].isActive, "The input address is already existing");
    ownerList_[_theObj] = _obj("N/A", ObjType.OWNER, true, false);
    ownerCounter ++;    
    numSigReqMST = ownerCounter/2 + 1;
    emit ownerAdded(_theObj);
    return true;
    }
    else { 
    //@dev Add admin to the contract
    require(!adminList_[_theObj].isActive, "The input address is already existing");
    adminList_[_theObj] = _obj("N/A", ObjType.ADMIN, true, false);
    adminCounter ++;    
    emit adminAdded(msg.sender, _theObj);
    return true;
    }
  }

function _transferObject(address _fromObj, address _toObj, ObjType _objType) internal returns (bool){
    // Check if the new owner address is valid
    require(_fromObj != address(0) && _toObj != address(0), "Invalid object addresses!");
    require(_objType == ObjType.ADMIN ||
            _objType == ObjType.OWNER, 
            "Object type is invalid!");
    if(_objType == ObjType.OWNER){
      require(!ownerList_[_toObj].isActive, "The input address is already existing!");
      // Revoking the signatures of the revoked owner on valid MST
      for(uint j = MSTList_.length; j > 0; j--) { // Backward loop for gas saving
          // Check if MTSx timeout
          if((block.timestamp - MSTList_[j-1].creationTime) >= MST_TIMEOUT) break;
          // Check if valid transaction which the revoked owner has signed
          if((MSTList_[j-1].isExecuted == false) && (isMSTSigned_[j-1][_fromObj] == true)){
          // Revoke signature of revoked owner
            MSTList_[j-1].signatureCount = MSTList_[j-1].signatureCount - 1;
            isMSTSigned_[j-1][_fromObj] = false;
            emit signatureRevoked(_fromObj, j-1);
          }
      }
      // Update ownership
      ownerList_[_fromObj].isActive = false;
      ownerList_[_toObj] = _obj("N/A", ObjType.OWNER, true, false);
      emit ownerTransfered(_fromObj, _toObj);
      return true;
    } 
    else { // _objType == ObjType.ADMIN)
      require(!adminList_[_toObj].isActive, "The address is already an existing admin!");
      // Revoking the signatures of the revoked owner on valid MSTx
      for(uint j = MSTList_.length; j > 0; j--) { // Backward loop for gas saving
          if((block.timestamp - MSTList_[j-1].creationTime) >= MST_TIMEOUT) break;
          if((MSTList_[j-1].isExecuted == false) && (isMSTSigned_[j-1][_fromObj] == true)){
            MSTList_[j-1].signatureCount = MSTList_[j-1].signatureCount - 1;
            isMSTSigned_[j-1][_fromObj] = false;
            emit signatureRevoked(_fromObj, j-1);
          }
      }
      adminList_[_fromObj].isActive = false;
      adminList_[_toObj] = _obj("N/A", ObjType.ADMIN, true, false);
      emit adminTransfered(_fromObj, _toObj);
      return true;
    }
  }

function _deactivateObject(address _theObj, ObjType _objType) internal returns (bool){
    require(_objType == ObjType.USER ||
            _objType == ObjType.OWNER ||
            _objType == ObjType.ADMIN, 
            "Object type is invalid!");
    if(_objType == ObjType.USER) {
      require(userList_[_theObj].isActive, "User does not exist!");
      require(userList_[_theObj].isActive, "The object is deactivated already!");
      userList_[_theObj].isActive = false;
      userCounter --;
      emit userDeactivated(msg.sender, _theObj);
      return true;
    }
    else if(_objType == ObjType.OWNER){
      require(ownerList_[_theObj].isActive, "Owner does not exists!");
      require(ownerList_[_theObj].isActive, "The owner is deactivated already!");
      require(ownerCounter > MIN_SIG_REQUIRED, "Require at least 3 owners to manage this contract");
      ownerList_[_theObj].isActive = false;
      ownerCounter --;
      numSigReqMST = ownerCounter/2 + 1;
      emit ownerDeactivated(_theObj);
      return true;
    } else { // _objType == ObjType.ADMIN)
      require(adminList_[_theObj].isActive, "The admin does not exists!");
      require(adminList_[_theObj].isActive, "The admin is deactivated already!");
      adminList_[_theObj].isActive = false;
      adminCounter --;
      emit adminDeactivated(msg.sender, _theObj);
      return true;
    }
  }

function _activateObject(address _theObj, ObjType _objType) internal returns (bool){
    require(_objType == ObjType.USER ||
            _objType == ObjType.OWNER ||
            _objType == ObjType.ADMIN, 
            "Object type is invalid!");
    if(_objType == ObjType.USER) {
      require(userList_[_theObj].isActive, "User does not exist!");
      require(!userList_[_theObj].isActive, "The object is activated already!");
      userList_[_theObj].isActive = true;
      userCounter ++;
      emit userActivated(msg.sender, _theObj);
      return true;
    }
    else if(_objType == ObjType.OWNER){
      require(ownerList_[_theObj].isActive, "Owner does not exists!");
      require(!ownerList_[_theObj].isActive, "The owner is activated already!");
      require(ownerCounter > MIN_SIG_REQUIRED, "Require at least 3 owners to manage this contract");
      ownerList_[_theObj].isActive = true;
      ownerCounter ++;
      numSigReqMST = ownerCounter/2 + 1;
      emit ownerActivated(_theObj);
      return true;
    } else { // _objType == ObjType.ADMIN)
      require(adminList_[_theObj].isActive, "The admin does not exists!");
      require(!adminList_[_theObj].isActive, "The admin is activated already!");
      adminList_[_theObj].isActive = true;
      adminCounter ++;
      emit adminDeactivated(msg.sender, _theObj);
      return true;
    }
  }

// ======================= MANAGE OBJECT WITHOUT MULTI-SIGN TRANSACTIONS =================================
function registerUser(string memory _profileId) public returns (bool) {
  require(!userList_[msg.sender].isActive,"The user is already registered!");
  userList_[msg.sender] = _obj(_profileId, ObjType.USER, false, false);
  userCounter ++;
  emit userRegistered(msg.sender);
  return true;
  } 
function getObjectCounter(ObjType _objType) external view onlyAdmin returns (uint _objCounter) {
       if(_objType == ObjType.USER)    return userCounter;
       else if(_objType == ObjType.OWNER)   return ownerCounter;
       else if(_objType == ObjType.ADMIN)   return adminCounter;
       else return sysAddrCounter;
}
function isObjectExisting(address _addr, ObjType _objType) external view onlyAdmin returns (bool _isObjectExisting) {
  require(_addr != address(0), "Invalid address!");
  if     (_objType == ObjType.USER)    return userList_[_addr].isActive;
  else if(_objType == ObjType.OWNER)   return ownerList_[_addr].isActive;
  else if(_objType == ObjType.ADMIN)   return adminList_[_addr].isActive;
  else                                 return sysAddrList_[_addr].isActive;
  }
  
function isAccountTradable(address _addr) external view onlyAdmin returns (bool) {
  require(_addr != address(0),"Invalid address!");
  return (sysAddrList_[_addr].isActive || 
          ownerList_[_addr].isActive   || 
          adminList_[_addr].isActive   || 
          userList_[_addr].isActive);
  }

function addObject(address _newObject, ObjType _objType, string calldata _objId) external onlyOwner returns (bool) {
  require(_newObject != address(0),"Invalid account!");
  require (_objType != ObjType.USER && _objType!= ObjType.OWNER,"You are not allowed to add an owner nor user here!");
  if(_objType == ObjType.ADMIN) {
    require(!adminList_[_newObject].isActive,"This admin is already existing!");
    adminList_[_newObject] = _obj(_objId, _objType, true, false);
    emit adminAdded(msg.sender,_newObject);
    return true;
  } else { // _objType == ObjType.SYSADDR)
    sysAddrList_[_newObject] = _obj(_objId, _objType, true, false);
    emit sysAddrAdded(msg.sender,_newObject);
    return true;
  }
  }

function transferObject(address _from, address _to, ObjType _objType) external onlyOwner returns (bool){
  require(_from != address(0) && _to != address(0), "Invalid object addresses!");
  require(_objType != ObjType.OWNER, "This should be executed under multi-sign transactions!");
  require(_objType != ObjType.USER, "No need to transfer user ownership!");
  require(_objType == ObjType.SYSADDR || _objType == ObjType.ADMIN, "Object type is invalid!");
  if(_objType == ObjType.ADMIN ){
    require(!adminList_[_to].isActive, "The new admin address is already existing!");
    adminList_[_from].isActive = false;
    adminList_[_to] = _obj("N/A", _objType, true, false);
    emit adminTransfered(_from, _to);
    return true;
    } 
  else { // _objType == ObjType.SYSADDR
    require(!sysAddrList_[_to].isActive, "The destination address is already existing!");
    sysAddrList_[_from].isActive = false;
    sysAddrList_[_to] = _obj("N/A", _objType, true, false);
    emit sysAddrTransfered(_from, _to);
    return true;
    }
  }

function deactivateObject(address _addr, ObjType _objType) external onlyAdmin returns (bool) {
  require(_addr != address(0), "Invalid address!");
  require(_objType != ObjType.OWNER, "This action must be executed under multi-sign transactions!");
  require(_objType == ObjType.USER  || 
          _objType == ObjType.ADMIN ||
          _objType == ObjType.SYSADDR, "Object type is invalid!");
  if(_objType == ObjType.USER){
    require(userList_[_addr].isActive, "The user is not existing!");
    require(userList_[_addr].isActive, "The user is deactivated already!");
    userList_[_addr].isActive = false;
    emit userDeactivated(msg.sender, _addr);
    return true;
  }
  else if(_objType == ObjType.ADMIN){
    require(adminList_[_addr].isActive, "The admin is not existing!");
    require(adminList_[_addr].isActive, "The admin is deactivated already!");
    adminList_[_addr].isActive = false;
    emit adminDeactivated(msg.sender, _addr);
    return true;
  } else { // _objType == SYSTEM ADDRESS
    require(sysAddrList_[_addr].isActive, "The system address is not existing!");
    require(sysAddrList_[_addr].isActive, "The system address is deactivated already!");
    sysAddrList_[_addr].isActive = false;
    emit sysAddrDeactivated(msg.sender, _addr);
    return true;
  }      
}

function activateObject(address _addr, ObjType _objType) external onlyAdmin returns (bool) {
  require(_addr != address(0), "Invalid address!");
  require(_objType != ObjType.OWNER, "Activating an owner must be executed under multi-sign transactions!");
  if(_objType == ObjType.USER){
    require(userList_[_addr].isActive, "The user is not existing!");
    require(!userList_[_addr].isActive, "The user is activated already!");
    userList_[_addr].isActive = true;
    emit userActivated(msg.sender, _addr);
    return true;
  }
  else if(_objType == ObjType.ADMIN){
    require(adminList_[_addr].isActive, "The admin is not existing!");
    require(!adminList_[_addr].isActive, "The admin is activated already!");
    adminList_[_addr].isActive = true;
    emit adminActivated(msg.sender, _addr);
    return true;
  } else { // _objType == SYSTEM ADDRESS
    require(sysAddrList_[_addr].isActive, "The system address is not existing!");
    require(!sysAddrList_[_addr].isActive, "The system address is activated already!");
    sysAddrList_[_addr].isActive = true;
    emit sysAddrActivated(msg.sender, _addr);
    return true;
  }      
}

function updateObjectInfo( 
  address       _objAddr,
  ObjType     _objType,
  string memory _objId, 
  bool          _isKYC) 
  external onlyAdmin returns (bool) {
  require(_objAddr != address(0), "Invalid address!");
  if(_objType == ObjType.USER) {
      require(userList_[_objAddr].isActive,"The user does not exists!");
      userList_[_objAddr].objectId = _objId;
      userList_[_objAddr].isKYC = _isKYC;
      emit userUpdated(msg.sender, _objAddr);
      return true;
  } else if(_objType == ObjType.ADMIN) {
      require(adminList_[_objAddr].isActive,"The admin does not exists!");
      adminList_[_objAddr].objectId = _objId;
      adminList_[_objAddr].isKYC = _isKYC;
      emit adminUpdated(msg.sender, _objAddr);
      return true;
  } else if(_objType == ObjType.OWNER) {
      require(ownerList_[_objAddr].isActive,"The owner does not exists!");
      ownerList_[_objAddr].objectId = _objId;
      ownerList_[_objAddr].isKYC = _isKYC;
      emit ownerUpdated(msg.sender, _objAddr);
      return true;
  } else { 
      require(sysAddrList_[_objAddr].isActive,"The system address does not exists!");
      sysAddrList_[_objAddr].objectId = _objId;
      sysAddrList_[_objAddr].isKYC = _isKYC;
      emit sysAddrUpdated(msg.sender, _objAddr);
      return true;
  }
  }

function getObjectInfo(address _objAddr, ObjType _objType) onlyAdmin external view returns(
  string memory _objId, 
  bool          _isActive, 
  bool          _isKYC) {
  require(_objAddr != address(0), "Invalid address!");
  if(_objType == ObjType.USER) {
    require(userList_[_objAddr].isActive,"The user does not exists!");
    _obj memory user = userList_[_objAddr];
    return(
      user.objectId,
      user.isActive,
      user.isKYC);
  } else if(_objType == ObjType.OWNER) {
    require(ownerList_[_objAddr].isActive,"The owner does not exists!");
    _obj memory owner = ownerList_[_objAddr];
    return(
      owner.objectId,
      owner.isActive,
      owner.isKYC);
    } else if(_objType == ObjType.ADMIN) {
    require(adminList_[_objAddr].isActive,"The admin does not exists!");
    _obj memory admin = adminList_[_objAddr];
    return(
      admin.objectId,
      admin.isActive,
      admin.isKYC);
    } else {
    require(sysAddrList_[_objAddr].isActive,"The system address does not exists!");
    _obj memory systemAddr = sysAddrList_[_objAddr];
    return(
      systemAddr.objectId,
      systemAddr.isActive,
      systemAddr.isKYC);
    }
  }
  function sayHello(string memory _message) external pure returns(string memory){
        return _message;
  }
}