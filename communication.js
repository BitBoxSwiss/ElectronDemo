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


"use strict"

const os = require('os');
const hid = require('./hid')
const cryptography = require('./cryptography')
const semver = require('semver')

// the frame size for USB communication
const usbReportSize = 64
// the hard ware wallet caller id
const hwwCID        = 0xff000000
// initial frame identifier
const	u2fHIDTypeInit = 0x80
// first vendor defined command
const	u2fHIDVendorFirst = u2fHIDTypeInit | 0x40
const	hwwCMD            = u2fHIDVendorFirst | 0x01

/**
 * Returns a buffer filled with the initial frame header,
 * which contains the length of the message that follows.
 */
function getInitialFrameHeader(dataLength) {
  var buffer = Buffer.allocUnsafe(7);
  buffer.writeUInt32BE(hwwCID, 0);
  buffer.writeUInt8(hwwCMD, 4);
  buffer.writeUInt16BE(dataLength & 0xffff, 5);
  return buffer;
}

/**
 * Returns a buffer with a continued frame header for
 * an ongoing communication. The sequence identifier identifies
 * the order of the messages. It starts at 0.
 */
function getContinuedFrameHeader(sequence) {
  var buffer = Buffer.allocUnsafe(5);
  buffer.writeUInt32BE(hwwCID, 0);
  buffer.writeUInt8(sequence, 4);
  return buffer;
}

/**
 * Returns a buffer with the message body encoded as UTF-8.
 */
function getBody(msg) {
  let buffer = Buffer.allocUnsafe(msg.length);
  buffer.write(msg, 0, msg.length, 'utf8');
  return buffer;
}

/**
 * Appends the content of the buffer to a passed byte array.
 * Returns the amount of bytes copied to the byte array.
 */
function append(byteArray, buffer, maxLength) {
  let i = 0;
  for (i = 0; i < buffer.length && i < maxLength; i++) {
    byteArray.push(buffer[i]);
  }
  return i;
}

/**
 * Writes the header + parts of the body (starting from
 * the given offset) to the interface and returns the number
 * of bytes of the body that were written.
 */
function send(device, header, body, offset) {
  let byteArray = [];
  let usedForHeader = append(byteArray, header, usbReportSize);
  let bytesOfBody = append(byteArray, body.slice(offset), usbReportSize - usedForHeader);
  if ((usedForHeader + bytesOfBody) < usbReportSize) {
    let fillLength = usbReportSize - (usedForHeader + bytesOfBody);
    append(byteArray, Buffer.alloc(fillLength, 0xee), fillLength);
  }
  console.log('---- request ----');
  console.log(JSON.stringify(byteArray));
  console.log('-----------------');
  if(os.platform() === 'win32') {
    byteArray.unshift(0);
  }
  device.write(byteArray)
  return bytesOfBody;
}

/**
 * Sends a message to a device.
 * The message is chunked into 64 byte frames.
 */
function sendFrames(device, msg) {
  var initialHeader = getInitialFrameHeader(msg.length);
  var body = getBody(msg);
  var bodyOffset = 0;
  // write initial header + body frame + cont. header + body frame, etc. and fill with 0xee
  bodyOffset = send(device, initialHeader, body, bodyOffset);
  let sequence = 0;
  while (bodyOffset < msg.length) {
    bodyOffset += send(device, getContinuedFrameHeader(sequence), body, bodyOffset);
    sequence++;
  }
}

function toString(bytes, length) {
  var string = "";
  for (var i = 0; i < bytes.length && i < length; i++) {
    string += String.fromCharCode(bytes[i]);
  }
  return string;
}

/**
 * Reads the response data frame. Called whenever the dbb responds with a frame.
 * The length of the data is always 64 bytes.
 */
function read(device) {
  let data = device.readSync();
  if (data.length < 7) {
    throw new Error('Invalid response received from device');
  }
  if (data[0] != 0xff || data[1] != 0 || data[2] != 0 || data[3] != 0) {
    throw new Error('USB command ID mismatch');
  }
  if (data[4] != hwwCMD) {
    throw new Error('USB command frame mismatch (' + data[4] + ', expected ' + hwwCMD + ')');
  }
  let readLength = data[5] * 256 + data[6];
  console.log('---- response ----');
  console.log(JSON.stringify(Array.prototype.slice.call(data, 0)));
  console.log('-----------------');
  let readBuffer = Buffer.allocUnsafe(readLength);
  let alreadyRead = readBuffer.write(toString(data.slice(7), readLength), 0);
  while (alreadyRead < readLength) {
    data = device.readSync();
    if (data.length < 5) {
      throw new Error('Invalid response received from device');
    }
    alreadyRead += readBuffer.write(toString(data.slice(5), readLength), alreadyRead);
  }
  //console.log("Read " + alreadyRead + " bytes from USB device");
  let responseText = readBuffer.toString();
  console.log('=> ' + responseText);
  let response = JSON.parse(responseText);
  return response;
}

/**
 * Generic helper function that handles resonse messages from the BitBox.
 */
function handleResponse(device, version, encryptionKey, authenticationKey, callback) {
  let response = read(device);
  if (response.ciphertext) {
    let decodedBytes = Buffer.from(response.ciphertext, 'base64')

    if (version && semver.gte(version, '5.0.0')) {
      // checks the HMAC and, on success, calls the decrypt function
      cryptography.checkHMAC(authenticationKey,
        decodedBytes,
        function(encryptedBytes) {
          cryptography.decryptAES(encryptionKey, encryptedBytes, callback);
        },
        callback);
    } else {
      cryptography.decryptAES(encryptionKey, decodedBytes, callback);
    }

  } else {
    callback(response);
  }
}

/**
 * The communication class provides messages for communicating with the dbb.
 */
module.exports = class Communication {

  /**
   * Initializes the communication, thereby opening the
   * communication to the device with the given device ID.
   */
  constructor(deviceID) {
    if (!deviceID) {
      console.error('device is not available')
      throw new Error('device is not available')
    }
    this.device = hid.openDevice(deviceID)
    //this.device.on("data", readFrame);
    this.encryptionKey = '';
    this.authenticationKey = '';
    this.version = '';
  }

  setVersion(version) {
    this.version = version;
  }

  /**
   * Closes the connection to the device.
   */
  close() {
    this.device.close();
  }

  /**
   * Sends a plain message to the dbb.
   */
  sendPlain(msg) {
    console.log('\nsending: ' + msg);
    sendFrames(this.device, msg)
    // blocking call
    let response = read(this.device);
    console.log(JSON.stringify(response));
    return response;
  }

  /**
   * Sends an encrypted message to the dbb and
   * calls the callback with the response.
   */
  sendEncrypted(msg, callback) {
    console.log('\nsending (encrypted): ' + msg);
    if (!this.encryptionKey || this.encryptionKey == '') {
      throw 'password required';
    }
    let device = this.device;
    let encryptionKey = this.encryptionKey;
    let authenticationKey = this.authenticationKey;
    let version = this.version;
    let encryptedMsg = cryptography.encryptAES(encryptionKey, msg, function(encryptedBytes) {

      let encodeAndSend = function(data) {
        let encodedData = data.toString('base64');
        console.log("=> " + encodedData)
        sendFrames(device, encodedData);
        handleResponse(device, version, encryptionKey, authenticationKey, function(data) {
          console.log("=> " + data)
          callback(JSON.parse(data));
        });
      };

      if (version && semver.gte(version, '5.0.0')) {
        cryptography.appendHMAC(authenticationKey, encryptedBytes, encodeAndSend);
      } else {
        encodeAndSend(encryptedBytes);
      }
    });
  }

  setCommunicationSecret(password) {
    if (this.version && semver.gte(this.version, '5.0.0')) {
      let sharedSecret = cryptography.sha512(cryptography.doubleHash(password));
      this.encryptionKey = sharedSecret.slice(0, 32);
      this.authenticationKey = sharedSecret.slice(32);
    } else {
      this.encryptionKey = cryptography.doubleHash(password);
    }
  }

}

