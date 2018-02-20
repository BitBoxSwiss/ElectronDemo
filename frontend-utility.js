"use strict";

/**
 * Set content in element. If the content is not a string,
 * JSON.stringify(content) is called.
 */
let setText = function(element, content) {
  if (typeof content === 'string') {
    element.text(content);
  } else {
    element.text(JSON.stringify(content, null, 2));
  }
  element.show();
}

/**
 * Clears the message box of the given element.
 */
exports.clearMsg = function(element) {
  element.removeClass('alert-danger');
  element.removeClass('alert-warning');
  element.removeClass('alert-info');
  element.removeClass('alert-success');
  element.removeClass('alert-secondary');
  element.hide();
}


/**
 * Applies the alert-secondary class to a given element
 * and sets the text to the given content.
 */
exports.setMsg = function(element, content) {
  element.removeClass('alert-danger');
  element.removeClass('alert-warning');
  element.removeClass('alert-info');
  element.removeClass('alert-success');
  element.addClass('alert-secondary');
  setText(element, content);
}

/**
 * Applies the alert-warning class to a given element
 * and sets the text to the given content.
 */
exports.setWarning = function(element, content) {
  element.removeClass('alert-info');
  element.removeClass('alert-success');
  element.removeClass('alert-danger');
  element.removeClass('alert-secondary');
  element.addClass('alert-warning');
  setText(element, content);
}

/**
 * Applies the alert-info class to a given element
 * and sets the text to the given content.
 */
exports.setSuccess = function(element, content) {
  element.removeClass('alert-danger');
  element.removeClass('alert-warning');
  element.removeClass('alert-info');
  element.removeClass('alert-secondary');
  element.addClass('alert-success');
  setText(element, content);
}

/**
 * Applies the alert-info class to a given element
 * and sets the text to the given content.
 */
exports.setInfo = function(element, content) {
  element.removeClass('alert-danger');
  element.removeClass('alert-success');
  element.removeClass('alert-warning');
  element.removeClass('alert-secondary');
  element.addClass('alert-info');
  setText(element, content);
}

/**
 * Applies the alert-danger class to a given element
 * and sets the text to the given content.
 */
exports.setError = function(element, content) {
  element.removeClass('alert-info');
  element.removeClass('alert-success');
  element.removeClass('alert-warning');
  element.removeClass('alert-secondary');
  element.addClass('alert-danger');
  setText(element, content);
}

/**
 * Disables elements requiring the device.
 * Called if device is unplugged.
 */
exports.disableElementsRequiringDevice = function() {
  let elements = $('.requires-device');
  elements.addClass('device-not-plugged-in');
  let inputElements = elements.find('input');
  inputElements.attr('disabled', 'disabled');
  $('.only-plugged-in').hide();
}

/**
 * Enables elements requiring the device.
 * Called if device is plugged.
 */
exports.enableElementsRequiringDevice = function() {
  let elements = $('.requires-device');
  elements.removeClass('device-not-plugged-in');
  let inputElements = elements.find('input');
  inputElements.removeAttr('disabled');
  $('.only-plugged-in').show();
}

/**
 * Disables elements requiring that the device initialzied.
 * Called if password is not set on device.
 */
exports.disableElementsRequiringInit = function() {
  let elements = $('.requires-init');
  elements.addClass('device-not-initialized');
  let inputElements = elements.find('input');
  inputElements.attr('disabled', 'disabled');
  $('.only-uninitialized').show();
}

/**
 * Enables elements requiring that the device initialzied.
 * Called if password is set on device.
 */
exports.enableElementsRequiringInit = function() {
  let elements = $('.requires-init');
  elements.removeClass('device-not-initialized');
  let inputElements = elements.find('input');
  inputElements.removeAttr('disabled');
  $('.only-uninitialized').hide();
}

/**
 * Disables elements requiring the device password.
 * Called if device password is not provided by the user.
 */
exports.disableElementsRequiringPassword = function() {
  let elements = $('.requires-password');
  elements.addClass('not-logged-in');
  let inputElements = elements.find('input');
  inputElements.attr('disabled', 'disabled');
}

/**
 * Enables elements requiring the device password.
 * Called if device password is provided by the user.
 */
exports.enableElementsRequiringPassword = function() {
  let elements = $('.requires-password');
  elements.removeClass('not-logged-in');
  let inputElements = elements.find('input');
  inputElements.removeAttr('disabled');
}

/**
 * Disables elements requiring the wallet.
 * Called if device seed was not generated.
 */
exports.disableElementsRequiringWallet = function() {
  let elements = $('.requires-wallet');
  elements.addClass('wallet-not-initialized');
  let inputElements = elements.find('input');
  inputElements.attr('disabled', 'disabled');
  $('.deactivate-on-seeded').removeClass('only-not-seeded');
}

/**
 * Enables elements requiring the wallet.
 * Called if device seed was generated.
 */
exports.enableElementsRequiringWallet = function() {
  let elements = $('.requires-wallet');
  elements.removeClass('wallet-not-initialized');
  let inputElements = elements.find('input');
  inputElements.removeAttr('disabled');
  $('.deactivate-on-seeded').addClass('only-not-seeded');
}

/**
 * Resets the frontend to it's initial state:
 * - clear all input fields
 * - hide all info messages
 * - disable all elements requiring that a password is set on the device
 * - disable all elements requiring that a password is provided
 * - disable all element requiring the wallet initialization
 */
exports.reset = function() {
  let inputs = $('input, textarea, select')
      .not(':input[type=button], :input[type=submit], :input[type=reset]');
  inputs.each(function(index) {
    if ($(this).attr('placeholder')) {
      console.log('input placeholder found: ' + $(this).attr('placeholder'));
      $(this).val($(this).attr('placeholder'));
      console.log('placeholder set as value: ' + $(this).val());
    } else {
      $(this).val('');
    }
  });
  $('.requires-device .info-msgs').hide();
  this.disableElementsRequiringInit();
  this.disableElementsRequiringPassword();
  this.disableElementsRequiringWallet();
}

