/*
 * Copyright (C) 2018 Shift Devices AG, Switzerland (info@shiftcrypto.ch)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


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

