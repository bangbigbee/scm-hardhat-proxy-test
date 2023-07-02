// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 

interface I_IdentityManager_Five {

  event systemPaused (address indexed owner);
  event systemUnpaused (address indexed owner);
 
  event userActivated(address indexed _activator, address indexed _activatedUser);
  event ownerActivated(address indexed _activator, address indexed _activatedOwner);
  event adminActivated(address indexed _activator, address indexed _activatedAdmin);
  event systemActivated(address indexed _activator, address indexed _activatedSystem);

  event userDeactivated(address indexed _deactivator, address indexed _deactivatedUser);
  event ownerDeactivated(address indexed _deactivator, address indexed _deactivatedOwner);
  event adminDeactivated(address indexed _deactivator, address indexed _deactivatedAdmin);
  event systemDeactivated(address indexed _deactivator, address indexed _deactivatedSystem);

  event userUpdated(address indexed _updater, address indexed _updatedUser);
  event ownerUpdated(address indexed _updater, address indexed _updatedOwner);
  event adminUpdated(address indexed _updater, address indexed _updatedAdmin);
  event systemUpdated(address indexed _updater, address indexed _updatedSystem);

  event ownerAdded(address indexed _Adder, address indexed _activatedUser);
  event adminAdded(address indexed _Adder, address indexed _activatedUser);
  event systemAdded(address indexed _Adder, address indexed _activatedUser);
  event userWalletAdded(address indexed _userWallet);

  function pauseSystem() external returns (bool);
  function unpauseSystem() external returns (bool);
  function addUserWallet(
    string calldata _name,
    string calldata _idType,
    string calldata _idValue
    ) external returns (bool); 
  function addObject(
    address         _addr, 
    uint256           _role, 
    string memory   _name,
    string memory   _idType,
    string memory   _idValue
    ) external returns (bool); 
  function deactivateObject(address _addr) external returns (bool); 
  function activateObject (address _addr) external returns (bool); 
  function updateObjectInfo( 
    address         _addr,
    string memory   _name,
    string memory   _idType, 
    string memory   _idValue,  
    bool            _isKYC) 
    external returns (bool);
  function getObjectInfo(address _userAddr) external returns(
    string memory   _name, 
    string memory   _idType, 
    string memory   _idValue, 
    uint256           _role,
    uint            _creationTime,
    uint            _updateTime,
    bool            _isActive, 
    bool            _isKYC);
  function isObjectTradable(address _addr) external view returns (bool);
  function getTotalObjCounter(uint256 _role) external returns (uint);
  function getActiveObjCounter(uint256 _role) external view returns (uint); 
  function isObjectExisting(address _addr) external view returns (bool);
  
  function submitMST(uint256 _txCode, uint256 _role, address _addr) external returns (bool);
  function signSubmittedMST(uint32 _txId) external returns (bool);
  function revokeSignature(uint32 _txId) external returns (bool);
  function executeMST(uint32 _txId) external returns (bool); 
  function getMSTCounter() external view returns (uint);
  function getMSTInfo(uint32 _txId) external view returns (
    uint256     _txCode,
    uint256     _role,
    address   _objAddr,
    uint256   _creationTime,
    uint256   _executionTime,
    bool      _isExecuted,
    uint256   _signatureCount);
  event MSTSubmited(address indexed owner,uint indexed txId);
  event MSTSigned(address indexed owner, uint indexed txId);
  event signatureRevoked(address indexed owner, uint indexed txId);
  event MSTExecuted(address indexed owner, uint indexed txId);
}
// =====================================================================================================
contract IdentityManager_Five is I_IdentityManager_Five {

    bool public initialized;    
    bool public paused; 
  // Object role code
    uint256 private constant USER        = 1;
    uint256 private constant OWNER       = 2;
    uint256 private constant ADMIN       = 3;
    uint256 private constant SYSTEM      = 4;
  // Multi-sign transaction code
    uint256 private constant AddTx       = 5;
    uint256 private constant DeactivTx   = 6;
    uint256 private constant ActivTx     = 7;
  // Configure multi-sign transaction 
    uint32 private constant MST_TIMEOUT = 1800;      
    uint256 private constant MIN_SIG_REQUIRED = 3;     
  // Structure of object
  struct _obj{
    string      name;
    string      idType;
    string      idValue;
    uint256       role;
    uint        creationTime;
    uint        updateTime;
    bool        isActive;
    bool        isKYC;
    }

  // Manage object
  mapping(address => _obj) public objList_;

  // Manage object counter
  mapping (uint256 => uint) private totalObjCounter_; 
  mapping (uint256 => uint) private actiObjCounter_;  

  // Manage multi-sign transactions 
  uint public numSigReqMST;                         
  struct _MST {                                      
      uint256   txCode;
      uint256   role;                    
      address objAddr;
      uint256 creationTime;
      uint256 executionTime;
      bool    isExecuted;
      uint    signatureCount;
    }
  // Manage transactions owner has signed 
  mapping(uint => mapping(address => bool)) public isMSTSigned_; 
  _MST[] private MSTList_;                           
  // Modifers
  modifier initializer() {
      require(!initialized, "Already initialized");
      _;}
  modifier onlyOwner() {
      require(objList_[msg.sender].role==OWNER && objList_[msg.sender].isActive, 
             "Not authorized as owner!");
      _; }
  modifier onlyAdmin() {
    require((objList_[msg.sender].role == ADMIN && objList_[msg.sender].isActive) || 
            (objList_[msg.sender].role == OWNER && objList_[msg.sender].isActive), 
           "Not authorized as admin!");
      _; }
  modifier isTxExisting(uint _txId) {
      require(_txId <= MSTList_.length, "Transaction does not exist");
      _; }
  modifier isTxNotExecutedYet(uint _txId) {
      require(!MSTList_[_txId-1].isExecuted, "Transaction already executed");
      _; }
  modifier iHaveNotSigned(uint _txId) {
      require(!isMSTSigned_[_txId][msg.sender], "Already signed");
      _; }
  modifier iHaveSigned(uint _txId) {
      require(isMSTSigned_[_txId][msg.sender], "Not signed yet");
      _; }
  modifier isExecutionTimeOut(uint _txId) {
      require(
        (block.timestamp - MSTList_[_txId-1].creationTime) <= MST_TIMEOUT,
        "Execution is only valid less than 30 minutes");
      _; }
  modifier whenUnpaused() {
    require(!paused, "System has been paused");
    _; }
  modifier whenPaused() {
    require(paused, "System has not been paused");
    _; }

  constructor() {
  }
// ========================================= MANAGE PROXY ====================================================
  function initializeSystem(address[] memory _initialOwners) public initializer { 
    require(_initialOwners.length >= MIN_SIG_REQUIRED,
           "Required at least 3 owners to initialize system");
    totalObjCounter_[OWNER] = 0;
    for (uint i = 0; i < _initialOwners.length; i++) {
            address owner = _initialOwners[i];
            require(owner != address(0), 
                   "Invalid owner");
            require(!objList_[owner].isActive, 
                   "Owner already exists");
            objList_[owner] = _obj("Name","IdType","IdValue", OWNER, block.timestamp, 0, true, true );
            totalObjCounter_[OWNER] ++;
            actiObjCounter_[OWNER] ++;
            emit ownerAdded(msg.sender, owner);
        }
    numSigReqMST = totalObjCounter_[OWNER]/2 + 1;
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

// Submit a multi-sign transaction
function submitMST(
    uint256   _txCode,
    uint256   _role, 
    address _objAddr
    ) public onlyOwner returns (bool){
    require(_txCode > 4 && _txCode < 8, 
           "Tx code does not exists");
    require((_txCode != AddTx || _role != USER), 
           "signSubmittedMST: No need MST to add user");
    require((_txCode != AddTx || _role != ADMIN), 
           "signSubmittedMST: No need MST to add admin");
    require((_txCode != AddTx || _role != SYSTEM), 
           "signSubmittedMST: No need MST to add system address");      
    MSTList_.push(
          _MST({
              txCode:         _txCode,
              role:           _role,
              objAddr:        _objAddr,          
              creationTime:   block.timestamp,
              executionTime:  0,
              isExecuted:     false,
              signatureCount: 0
          })
      );
    uint txId = MSTList_.length;
    emit MSTSubmited(msg.sender, txId);
    return true;
  }
// Sign a submitted transaction
  function signSubmittedMST(uint32 _txId) public
      onlyOwner
      isTxExisting(_txId)
      isTxNotExecutedYet(_txId)
      iHaveNotSigned(_txId)
      isExecutionTimeOut(_txId)
      returns (bool) {
        _MST storage mst = MSTList_[_txId-1];
        mst.signatureCount += 1;
        isMSTSigned_[_txId][msg.sender] = true;
        emit MSTSigned(msg.sender, _txId);
        return true;
      }
// Revoke signature from a multi-sign transaction
  function revokeSignature(uint32 _txId) public
      onlyOwner
      isTxExisting(_txId)
      isTxNotExecutedYet(_txId)
      iHaveSigned(_txId)
      isExecutionTimeOut(_txId)
      returns (bool) {
        _MST storage mst = MSTList_[_txId-1];
        mst.signatureCount -= 1;
        isMSTSigned_[_txId][msg.sender] = false;
        emit signatureRevoked(msg.sender, _txId);
        return true;
      }
// Execute a multi-sign transaction
  function executeMST(uint32 _txId) public
      onlyOwner
      isTxExisting(_txId)
      isTxNotExecutedYet(_txId)
      isExecutionTimeOut(_txId)
      returns (bool){
        _MST storage mst = MSTList_[_txId-1];
        require(mst.signatureCount >= numSigReqMST,
                "Not enough signatures to execute transaction");
        if(mst.txCode == AddTx && mst.role == OWNER)      
                                     _addOwner(mst.objAddr);
        else
        if(mst.txCode == DeactivTx) _deactivateObj(mst.objAddr);
        else 
        if(mst.txCode == ActivTx)   _activateObj(mst.objAddr);
        else 
        return false;                    
        mst.isExecuted = true;
        emit MSTExecuted(msg.sender, _txId);
        return true;
      }

  function getMSTCounter() public view onlyOwner returns (uint) {
      return MSTList_.length;
  }

  function getMSTInfo(uint32 _txId) public view isTxExisting(_txId) onlyOwner returns (
        uint256   txCode,
        uint256   role,
        address objAddr,
        uint256 creationTime,
        uint256 executionTime,
        bool    isExecuted,
        uint256 signatureCount){
      _MST storage mst = MSTList_[_txId-1];      
      return (
        mst.txCode,
        mst.role,
        mst.objAddr,
        mst.creationTime,
        mst.executionTime,
        mst.isExecuted,
        mst.signatureCount
      );
  }
// Internal functions used for executions under multi-sign transactions
function _addOwner(address _addr) internal returns (bool){
    require(!isObjectExisting(_addr),
           "_addOwner: owner already existed");
    numSigReqMST = totalObjCounter_[OWNER]/2 + 1;    
    objList_[_addr] = _obj("", "", "N/A", OWNER, block.timestamp, 0, true, false);
    totalObjCounter_[OWNER] ++;
    actiObjCounter_[OWNER] ++;    
    emit ownerAdded(msg.sender, _addr);
    return true;
    }

function _deactivateObj(address _addr) internal returns (bool){
      require(isObjectExisting(_addr),
             "_DeactivateObj: object does not exist");
      require(objList_[_addr].isActive, 
             "_DeactivateObj: object already deactivated");
      objList_[_addr].isActive = false;
      uint256 _role = objList_[_addr].role;
      actiObjCounter_[_role] --;
      if      (_role == USER) 
        emit userDeactivated(msg.sender, _addr);
      else if (_role == OWNER) 
        emit ownerDeactivated(msg.sender, _addr);
      else if (_role == ADMIN) 
        emit adminDeactivated(msg.sender, _addr);
      else if (_role == SYSTEM) 
        emit systemDeactivated(msg.sender, _addr);
      else 
        return false;
      return true;
    }

function _activateObj(address _addr) internal returns (bool){
      require(isObjectExisting(_addr),
             "_activateObj: object does not exist");
      require(!objList_[_addr].isActive, 
             "_activateObj: object activated already");
      objList_[_addr].isActive = true;
      uint256 _role = objList_[_addr].role;
      actiObjCounter_[_role] ++;
      if      (_role == USER) 
        emit   userActivated(msg.sender, _addr);
      else if (_role == OWNER) 
        emit  adminActivated(msg.sender, _addr);
      else if (_role == ADMIN) 
        emit  adminActivated(msg.sender, _addr);
      else if (_role == SYSTEM) 
        emit systemActivated(msg.sender, _addr);
      else 
        return false;
      return true;
    }

/*==============================================================================================*/
function addUserWallet(
      string memory _name, 
      string memory _idType,
      string memory _idValue) public returns (bool) {
  require(objList_[msg.sender].role == 0,
         "addUserWallet: accounts already registered or being active");  
  require(bytes(_name).length != 0, 
         "addUserWallet: user name must not be empty");
  require(bytes(_idType).length != 0, 
         "addUserWallet: user id type must not be empty");
  require(bytes(_idValue).length != 0, 
         "addUserWallet: user id value must not be empty");
  objList_[msg.sender] = _obj(_name, _idType, _idValue, USER, block.timestamp, 0, false, false);
  totalObjCounter_[USER] ++;   
  emit userWalletAdded(msg.sender);
  return true;
  }

function getTotalObjCounter(uint256 _role) external view onlyAdmin returns (uint _objTotalCounter) {
  require(_role < 5 && _role > 0, "getObjectCounter: invalid object type");   
  return totalObjCounter_[_role];
}
function getActiveObjCounter(uint256 _role) external view onlyAdmin returns (uint _objActiveCounter) {
  require(_role < 5 && _role > 0, "getActiveObjCounter: invalid object type");   
  return actiObjCounter_[_role];
}

function isObjectExisting(address _addr) public view onlyAdmin returns (bool _isObjectExisting) {
  require(_addr != address(0), "isObjectExisting: invalid address!");
  return objList_[_addr].role != 0;
  }

function isObjectTradable(address _addr) external view onlyAdmin returns (bool) {
  require(isObjectExisting(_addr),
         "isObjectTradable: object does not exist");
  return (objList_[_addr].isActive && !paused);
  }

function addObject(
      address       _newObj, 
      uint256         _role, 
      string memory _name, 
      string memory _idType, 
      string memory _idValue) external onlyAdmin returns (bool) {
  require(!isObjectExisting(_newObj),
         "addObject: object already exists");
  require(bytes(_name).length != 0, 
         "addObject: object name must not be empty");
  require(_role == ADMIN || _role == SYSTEM, 
         "addObject: only for admin and system address");
    objList_[_newObj] = _obj(_name, _idType, _idValue, _role, block.timestamp, 0, true, false);
    totalObjCounter_[_role] ++;
    actiObjCounter_[_role] ++;
    if(_role == ADMIN) 
      emit adminAdded(msg.sender, _newObj);
    else 
    if(_role == SYSTEM)
      emit systemAdded(msg.sender, _newObj); 
    else 
      return false;
    return true;
  }

function deactivateObject(address _addr) external onlyAdmin returns (bool) {
    require(isObjectExisting(_addr),
         "deactivateObject: object does not exist");
    uint256 _role = objList_[_addr].role;
    require(_role != OWNER, 
           "deactivateObject: for owner, must be executed with MST");
    require(objList_[_addr].isActive,          
           "deactivateObject: object already deactivated");
    objList_[_addr].isActive = false;
    actiObjCounter_[_role] --;
    if      (_role == USER) 
      emit userDeactivated(msg.sender, _addr);
    else if (_role == ADMIN) 
      emit adminDeactivated(msg.sender, _addr);
    else if (_role == SYSTEM) 
      emit systemDeactivated(msg.sender, _addr);
    else 
      return false;
    return true;
  }

function activateObject(address _addr) external onlyAdmin returns (bool) {
    require(isObjectExisting(_addr),
         "activateObject: object does not exist");
    uint256 _role = objList_[_addr].role;
    require(_role != OWNER,                   
         "activateObject: must be executed with MST");
    require(!objList_[_addr].isActive,         
         "activateObject: object activated already");
    objList_[_addr].isActive = true;
    actiObjCounter_[_role] ++;
    if      (_role == USER) 
      emit userActivated(msg.sender, _addr);
    else if (_role == ADMIN) 
      emit adminActivated(msg.sender, _addr);
    else if (_role == SYSTEM) 
      emit systemActivated(msg.sender, _addr);
    else 
      return false;
    return true;
  }

function updateObjectInfo( 
    address       _addr,
    string memory _name,
    string memory _idType, 
    string memory _idValue,  
    bool          _isKYC) 
    external onlyAdmin returns (bool) {
    require(isObjectExisting(_addr),
          "updateObjectInfo: object does not exist");
    uint256 _role = objList_[_addr].role;
    objList_[_addr].name       = _name;
    objList_[_addr].idType     = _idType;
    objList_[_addr].idValue    = _idValue;
    objList_[_addr].isKYC      = _isKYC;
    objList_[_addr].updateTime = block.timestamp;
    if      (_role == USER) 
      emit   userUpdated(msg.sender, _addr);
    else if (_role == OWNER) 
      emit  ownerUpdated(msg.sender, _addr);
    else if (_role == ADMIN) 
      emit  adminUpdated(msg.sender, _addr);
    else if (_role == SYSTEM) 
      emit systemUpdated(msg.sender, _addr);
    else 
      return false;
    return true;
    }

function getObjectInfo(address _addr) onlyAdmin external view returns(
  string memory _name,
  string memory _idType,
  string memory _idValue,
  uint256         _role,
  uint          _creationTime,
  uint          _updateTime, 
  bool          _isActive,  
  bool          _isKYC) {
  require(isObjectExisting(_addr),
         "getObjectInfo: object does not exist");
  _obj storage obj = objList_[_addr];
  return(
      obj.name,
      obj.idType,
      obj.idValue,
      obj.role,
      obj.creationTime,
      obj.updateTime,
      obj.isActive,
      obj.isKYC);
  }
  
function _toString(uint256 _code) internal pure returns(string memory){
  require(_code < 12 && _code > 0, "toString: invalid code");
  if (_code == 1)   return "User";
  if (_code == 2)   return "Owner";
  if (_code == 3)   return "Admin";
  if (_code == 4)   return "System";
  if (_code == 5)   return "AddTx";
  if (_code == 6)   return "DeactiTx";
  if (_code == 7)   return "ActiTx";
  return "";
}

function sayGoodbye(string memory _message) external pure returns(string memory){
    return (string(abi.encodePacked("Goodbye ", _message)));
  }

}


/* UPDATE SMARt CONTRACT V4 TO V5
* V2
- Add a new function to smart contract
- This function does not affect global variable of previous version

* V4:
- change 'memory' to 'storage'
- string memory ==> string storage
 @ _MST storage mst = MSTList_[_txId-1];
 @ sign and revoke signature

*V5:
- change variable type
- from uint8 to uint256
*/