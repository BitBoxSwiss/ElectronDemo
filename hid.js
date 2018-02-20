"use strict";

const HID = require('node-hid')

/**
 * Returns the device info of the digital bit box or null if no 
 * bit box was found.
 */
exports.getDeviceInfo = function() {
  const devices = HID.devices()
  var deviceInfo = devices.find( function(d) {
    var isBitBox = d.vendorId === 0x03eb && d.productId === 0x2402;
    // usage page is correctly set on Windows/Mac, 
    // interface is correctly set on Linux.
    return isBitBox && (d.usagePage === 0xFFFF || d.interface === 0);
  });
  if (deviceInfo) {
    return deviceInfo;
  }
  return null;
}

/**
 * Opens the device.
 */
exports.openDevice = function(devicePath) {
  return new HID.HID(devicePath);
}

