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
 * Encrypts the given message with AES-256 using the CBC Cipher Mode.
 * When the encryption is done, the output is encoded as base64 string and 
 * handed to the given callback.
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
    callback(encrypted.toString('base64'));
  });

  // PKCS padding is appended, because autopadding is enabled by default.
  cipher.write(msg);
  cipher.end();
}

/**
 * Decodes and decrypts the given base64 encoded ciphertext using AES-256-CBC and
 * calls the callback upon successful decryption.
 */
exports.decryptAES = function(key, encodedCiphertext, callback) {
  var ciphertext_iv = Buffer.from(encodedCiphertext, 'base64');
  var iv = ciphertext_iv.slice(0, AES_BLOCK_SIZE);
  var ciphertext = ciphertext_iv.slice(AES_BLOCK_SIZE);
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
