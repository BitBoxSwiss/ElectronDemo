"use strict"

const hid = require('./hid')
const cryptography = require('./cryptography')

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
  device.write(byteArray)
  return bytesOfBody;
}

/**
 * Sends a message to a device.
 * The message is chunked into 64 byte frames.
 */
function sendFrame(device, msg) {
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
    this.secret = '';
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
    sendFrame(this.device, msg)
    // blocking call
    let response = read(this.device);
    console.log(JSON.stringify(response));
    return response;
    /*while (data) {
      readFrame(data);
      data = this.device.readSync();
      console.log('read sync: ' + data);
    }*/
  }

  /**
   * Sends an encrypted message to the dbb and
   * calls the callback with the response.
   * If the executeBeforeDecrypt callback is defined, it is 
   * called before the decryption.
   */
  sendEncrypted(msg, callback, executeBeforeDecrypt) {
    console.log('\nsending (encrypted): ' + msg);
    if (!this.secret || this.secret == '') {
      throw 'password required';
    }
    let d = this.device;
    let s = this.secret;
    let encryptedMsg = cryptography.encryptAES(this.secret, msg, function(data) { 
      console.log("=> " + data) 
      sendFrame(d, data);
      let response = read(d);
      console.log(JSON.stringify(response));
      if (response.ciphertext) {
        if (executeBeforeDecrypt) {
          executeBeforeDecrypt();
        }
        cryptography.decryptAES(s, response.ciphertext, function(data) {
          console.log("=> " + data) 
          callback(JSON.parse(data));
        });
      } else {
        callback(response);
      }
    });
  }

  setCommunicationSecret(password) {
    this.secret = cryptography.doubleHash(password);
  }

}

