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


'use strict'

const crypto = require("crypto");

// 16 bytes, 128 bits block size for AES
const AES_BLOCK_SIZE = 16;

const SHA256_SIZE = 32;

/**
 * Performs a double SHA-256 hash on the given data.
 * Used to stretch the key.
 */
exports.doubleHash = function(data) {
  data = crypto.createHash('sha256').update(data).digest();
  data = crypto.createHash('sha256').update(data).digest();
  return data;
}

/**
 * Performs a SHA-512 hash on the given data.
 */
exports.sha512 = function(data) {
  data = crypto.createHash('sha512').update(data).digest();
  return data;
}

/**
 * Encrypts the given message with AES-256 using the CBC Cipher Mode.
 * Returns a buffer of encrypted bytes.
 */
exports.encryptAES = function(key, msg, callback) {
  var iv = crypto.pseudoRandomBytes(AES_BLOCK_SIZE);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = Buffer.from(iv);
  cipher.on('readable', () => {
    const data = cipher.read();
    if (data) {
      encrypted = Buffer.concat([encrypted, data]);
    }
  });
  cipher.on('end', () => {
    callback(encrypted);
  });

  // PKCS padding is appended, because autopadding is enabled by default.
  cipher.write(msg);
  cipher.end();
}

/**
 * Decodes and decrypts the given ciphertext using AES-256-CBC and
 * calls the callback upon successful decryption.
 */
exports.decryptAES = function(key, ciphertext_iv, callback) {
  let iv = ciphertext_iv.slice(0, AES_BLOCK_SIZE);
  let ciphertext = ciphertext_iv.slice(AES_BLOCK_SIZE);
  const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = '';
  cipher.on('readable', () => {
    const data = cipher.read();
    if (data) {
      decrypted += data;
    }
  });
  cipher.on('end', () => {
//    console.log('decrypted: ' + decrypted);
    callback(decrypted)
  });

  cipher.write(ciphertext);
  cipher.end();
}

/**
 * Calculates and appends an HMAC to the message.
 */
exports.appendHMAC = function(key, msg, callback) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.on('readable', () => {
    const data = hmac.read();
    if (data) {
      msg = Buffer.concat([msg, data]);
    }
  });
  hmac.on('end', () => {
    callback(msg);
  });

  // PKCS padding is appended, because autopadding is enabled by default.
  hmac.write(msg);
  hmac.end();
}

/**
 * Calculates and verifies HMAC on message.
 * If the verification is successful, it passes the message (without the HMAC
 * appendix) to the successCallback.
 */
exports.checkHMAC = function(key, data, successCallback, errorCallback) {
  const msg = data.slice(0, -SHA256_SIZE);
  const receivedHmac = data.slice(-SHA256_SIZE);
  const hmac = crypto.createHmac('sha256', key);
  let computedHmac = Buffer.from([]);
  hmac.on('readable', () => {
    const data = hmac.read();
    if (data) {
      computedHmac = Buffer.concat([computedHmac, data]);
    }
  });
  hmac.on('end', () => {
    if (computedHmac.equals(receivedHmac)) {
      successCallback(msg);
    } else {
      errorCallback("Message is corrupt");
    }
  });

  // PKCS padding is appended, because autopadding is enabled by default.
  hmac.write(msg);
  hmac.end();
}

