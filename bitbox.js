"use strict";

const Communication = require('./communication')
const pbkdf2 = require('pbkdf2')

const nameRegex = /^[0-9a-zA-Z-_ ]{1,31}$/;

function stretchKey(key) {
  // TODO: could be done asynchronously.
  return pbkdf2.pbkdf2Sync(key, 'Digital Bitbox', 20480, 64, 'sha512').toString('hex');
}

/**
 * The bitbox class provides methods that can be called
 * on the Digital Bitbox.
 */
module.exports = class Bitbox {

  /**
   * Initializes the bitbox.
   */
  constructor(deviceID) {
    this.deviceID = deviceID;
    this.communication = new Communication(deviceID)
    this.password = '';
    this.name = '';
    this.state = {
      initialized : false,
      seeded : false
    }
  }

  /**
   * Returns the device ID.
   */
  getDeviceID() {
    return this.deviceID;
  }

  /**
   * Calls 'ping' on the bitbox.
   */
  ping(errorCallback) {
    try {
      let response = this.communication.sendPlain('{ "ping" : "" }');
      this.state.initialized = response.ping === 'password';
      return response;
    } catch(e) {
      errorCallback(e);
    }
  }

  /**
   * Set's the current device password, which is used as an
   * input for the communication secret.
   */
  setPassword(password) {
    this.communication.setCommunicationSecret(password);
    this.password = password;
  }

  /**
   * Updates the device password.
   */
  updatePassword(password, callback) {
    let _self = this;
    this.communication.sendEncrypted('{ "password" : "' + password + '" }', callback, function() {
      _self.setPassword(password);
    });
  }

  /**
   * Creates a new device password.
   * This method can only be used if the device is uninitialized.
   */
  createPassword(password) {
    let response = this.communication.sendPlain('{ "password" : "' + password + '" }');
    if (!response.error) {
      this.setPassword(password);
    }
    return response;
  }

  /**
   * Calls 'name: <name>' on the bitbox.
   */
  setName(name, successCallback, errorCallback) {
    try {
      if (!name || !nameRegex.exec(name)) {
        throw 'Only 1 to 31 alphanumeric characters are allowed.';
      }
      let _self = this;
      this.communication.sendEncrypted('{ "name" : "' + name + '" }', function(response) {
        _self.name = name;
        successCallback(response)
      });
    } catch (e) {
      errorCallback(e);
    }
  }

  /**
   * Calls 'name: ""' on the bitbox.
   */
  getName(successCallback, errorCallback) {
    try {
      this.communication.sendEncrypted('{ "name" : "" }', function(response) {
        this.name = response.name;
        successCallback(response);
      });
    } catch (e) {
      errorCallback(e);
    }
  }

  /**
   * Calls 'device: info' on the bitbox.
   */
  deviceInfo(successCallback, errorCallback) {
    try {
      let _self = this;
      this.communication.sendEncrypted('{ "device" : "info" }', function(response) {
        if (response.device) {
          _self.state.seeded = response.device.seeded;
          _self.name = response.device.name;
          successCallback(response);
        } else {
          errorCallback(response);
        }
      });
    } catch (e) {
      errorCallback(e);
    }
  }

  /**
   * Resets the device.
   */
  reset(successCallback, errorCallback) {
    try {
      let _self = this;
      this.communication.sendEncrypted('{ "reset" : "__ERASE__" }', function(response) {
        _self.setPassword('');
        successCallback(response);
      });
    } catch (e) {
      console.log("Error: " + e);
      errorCallback(e);
    }
  }

  /**
   * Creates a wallet.
   */
  createWallet(name, successCallback, errorCallback) {
    try {
      if (!name || !nameRegex.exec(name)) {
        throw 'Only 1 to 31 alphanumeric characters are allowed.';
      }
      let stretchedKey = stretchKey(this.password);
      console.log('stretchedKey: ' + stretchedKey);
      this.communication.sendEncrypted('{ "seed" : { "source" : "create", "key" : "' + stretchedKey + '", "filename" : "' + name+ '.pdf" } }', successCallback);
    } catch (e) {
      console.log("Error: " + e);
      errorCallback(e);
    }
  }

  /**
   * Calls '"xpub" : "<path>"' on the bitbox.
   */
  getXPub(keypath, successCallback, errorCallback) {
    try {
      this.communication.sendEncrypted('{ "xpub" : "' + keypath + '" }', successCallback);
    } catch (e) {
      errorCallback(e);
    }
  }

  /**
   * Signs the transaction on the device.
   * The 'sign' command must be send twice. The first command produces
   * an encrypted verfication message. The second command returns an 
   * array of signatures and corresponding signing pubkeys.
   */
  sign(keypath, hash, successCallback, errorCallback) {
    try {
      let signRequest1 = '{ "sign" : { "meta" : "hash", "data" : [{ "keypath" : "' + keypath + '", "hash" : "' + hash + '" }] } }';
      let signRequest2 = '{ "sign" : "" }';
      let _self = this;
      this.communication.sendEncrypted(signRequest1, function(response1) {
        console.log(JSON.stringify(response1));
        try {
          _self.communication.sendEncrypted(signRequest2, function(response2) {
            successCallback(response2);
          });
        } catch (e) {
          errorCallback(e);
        }
      });
    } catch (e) {
      errorCallback(e);
    }
  }

  /**
   * Send any command.
   */
  sendAny(content, encrypted, successCallback, errorCallback) {
    try {
      if (encrypted) {
        this.communication.sendEncrypted(content, successCallback);
      } else {
        let response = this.communication.sendPlain(content);
        successCallback(response);
      }
    } catch (e) {
      errorCallback(e);
    }
  }


  /**
   * Closes the communication.
   */
  close() {
    this.communication.close();
  }

}


