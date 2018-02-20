// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

window.$ = window.jQuery = require('jquery')

const hid = require('./hid')
const frontend = require('./frontend-utility')
const Bitbox = require('./bitbox')

const intervalTime = 3000;

// Stores public information about the USB device.
let hidInfo = null;

// The Digital Bitbox.
let bitbox = null;

/**
 * Throws an error if the condition does not evaluate to true.
 */
function ensure(condition) {
  if (!condition) {
    throw new Error('Failed precondition');
  }
}

// Resetting front end initially.
frontend.reset();

/**
 * Updates the GUI according to the plug-in status of the device.
 */
function printPluginStatus() {
  hidInfo = hid.getDeviceInfo()
  if (hidInfo == null) {
    frontend.setWarning($('#device-status'), 'Digital Bitbox not plugged in.');
    frontend.setMsg($('#public-device-info'), 'No device plugged in.');
    frontend.disableElementsRequiringDevice();
    if (bitbox != null) {
      bitbox = null;
      frontend.reset();
    }
  } else {
    frontend.setInfo($('#device-status'), 'Digital Bitbox plugged in.');
    frontend.setSuccess($('#public-device-info'), hidInfo);
    frontend.enableElementsRequiringDevice();
    if (bitbox === null) {
      bitbox = new Bitbox(hidInfo.path);
      // The setTimeout is a temporary workaround and can be removed after the next firmware version.
      // It is only needed if you want to implement device initialization inside your app.
      // Otherwise, it can be safely skipped. Just prompt the user for the password; 
      // the device will respond with the 101 error code in case the device is not initialized
      setTimeout(printInitializationStatus, 3000);
    }
  }
}
printPluginStatus();
var handle = setInterval(printPluginStatus, intervalTime);

/**
 * Updates the GUI according to the initialization status of the device.
 */
function printInitializationStatus() {
  ensure(bitbox);

  let pingResponse = bitbox.ping(function(e) {
    frontend.setError($('#init-info'), e);
  });
  frontend.setSuccess($('#ping-info'), pingResponse);
  if (bitbox.state.initialized) {
    frontend.setInfo($('#init-info'), 'Device is initialized. Password has been set.');
    frontend.enableElementsRequiringInit();
  } else {
    frontend.setInfo($('#init-info'), 'Device is not yet initialized. Please set a password.');
    frontend.disableElementsRequiringInit();
  }
}

/**
 * Calls device info on the bitbox. In case an error
 * happend, the given error callback will be called.
 * Otherwise, the device info is printed in the
 * device-info-msg box.
 */
function deviceInfo(errorCallback) {
  ensure(bitbox);
  ensure(bitbox.password);

  $(".spinner").show();
  bitbox.deviceInfo(function(response) {
    $(".spinner").hide();
    frontend.enableElementsRequiringPassword();
    frontend.setSuccess($('#device-info-msg'), response);
    $('#set-name-input').val(response.device.name);
    if (bitbox.state.seeded) {
      frontend.enableElementsRequiringWallet();
    }
  }, function(response) {
    $(".spinner").hide();
    errorCallback(response);
  });
}

/**
 * Calls device info on the bitbox and prints either the device info
 * or an error in the device-info-msg box.
 */
$('#get-device-info').click(function() {
  deviceInfo(function(response) {
    frontend.setError($('#device-info-msg'), response);
  });
});

/**
 * Performs a log in by calling device info over an encrypted channel.
 */
$('#login').submit(function(event) {
  event.preventDefault();
  ensure(bitbox);

  frontend.clearMsg($('#login-info'));
  let password = $('#pw-current').val();
  bitbox.setPassword(password);
  deviceInfo(function(response) {
    frontend.setError($('#login-info'), 'Password is invalid.');
  });
  printInitializationStatus();
});

/**
 * Sets the name.
 */
$('#set-name').submit(function(event) {
  event.preventDefault();

  ensure(bitbox);
  ensure(bitbox.password);

  let name = $('#set-name-input').val();
  bitbox.setName(name, function(response) {
    frontend.setSuccess($('#set-name-msg'), response);
  }, function(response) {
    frontend.setError($('#set-name-msg'), response);
  });
});

/**
 * Query XPub.
 */
$('#get-xpub').submit(function(event) {
  event.preventDefault();

  ensure(bitbox);
  ensure(bitbox.password);

  let keypath = $('#get-xpub-input').val();
  $(".spinner").show();
  bitbox.getXPub(keypath, function(response) {
    $(".spinner").hide();
    frontend.setSuccess($('#get-xpub-msg'), response);
  }, function(response) {
    $(".spinner").hide();
    frontend.setError($('#get-xpub-msg'), response);
  });
});

/**
 * Resets the device.
 */
$('#reset').click(function() {
  ensure(bitbox);
  ensure(bitbox.password);

  $(".spinner").show();
  bitbox.reset(function(response) {
    $(".spinner").hide();
    frontend.reset();
    printInitializationStatus();
    // TODO: show pop-up instead.
    frontend.setSuccess($('#reset-msg'), response);
  }, function(error) {
    $(".spinner").hide();
    frontend.setError($('#reset-msg'), error);
  });
});

/**
 * Create a seed on the bitbox, which initializes the
 * wallet.
 */
$('#create-wallet').submit(function(event) {
  event.preventDefault();

  ensure(bitbox);
  ensure(bitbox.password);

  $(".spinner").show();
  let backupName = $('#create-wallet-input').val();
  bitbox.createWallet(backupName, function(response) {
    $(".spinner").hide();
    frontend.enableElementsRequiringWallet();
    frontend.setSuccess($('#create-wallet-msg'), response);
  }, function(error) {
    $(".spinner").hide();
    frontend.setError($('#create-wallet-msg'), error);
  });
});

/**
 * Signs a transaction by passing the keypath
 * and signature hash to the bitbox.
 */
$('#sign').submit(function() {
  event.preventDefault();

  ensure(bitbox);
  ensure(bitbox.password);

  $(".spinner").show();
  let keypath = $('#sign-keypath').val();
  let hash = $('#sign-hash').val();
  bitbox.sign(keypath, hash, function(response) {
    $(".spinner").hide();
    frontend.setSuccess($('#sign-msg'), response);
  }, function(error) {
    $(".spinner").hide();
    frontend.setError($('#sign-msg'), error);
  });
});

/**
 * Creates or updates the password on the device.
 */
$('#set-password').submit(function() {
  event.preventDefault();

  ensure(bitbox);

  $(".spinner").show();
  $('#set-password-info').hide();
  $('#pw').removeClass('is-invalid');
  $('#pw-repeat').removeClass('is-invalid');
  let pw = $('#pw').val();
  let pwRepeat = $('#pw-repeat').val();
  if (!pw || pw == '') {
    $('#pw').addClass('is-invalid');
  }
  if (pw != pwRepeat) {
    $('#pw-repeat').addClass('is-invalid');
  }
  let setPasswordResponse;
  if (bitbox.state.initialized) {
    bitbox.updatePassword(pw, function(response) {
      frontend.setSuccess($('#set-password-info'), response);
      $(".spinner").hide();
    });
  } else {
    let setPasswordResponse = bitbox.createPassword(pw);
    frontend.setSuccess($('#set-password-info'), setPasswordResponse);
    $(".spinner").hide();
  }
  printInitializationStatus();
  $('#pw-current').val(pw);
  frontend.enableElementsRequiringPassword();
});

/**
 * Send any command to the bitbox.
 */
$('#misc').submit(function() {
  event.preventDefault();
  
  let command = $('#misc-input').val();
  let sendEncrypted = $('#misc-input-encrypt').prop('checked');
  console.log('send encrypted: ' + sendEncrypted);
  bitbox.sendAny(command, sendEncrypted, function(response) {
    frontend.setSuccess($('#misc-msg'), response);
  }, function(response) {
    frontend.setError($('#misc-msg'), response);
  });
});

