/*jslint node:true, indent: 2*/
var
  userProvider;

userProvider = (function () {
  'use strict';
  var
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    userSchema,
    User;

  userSchema = new Schema({
    'create': Date,
    'namme': String,
    'email':  String,
    'password': String,
    'identifier': String
  });
  
  User = mongoose.model('User', userSchema);
  
  return {
    'getSchema': userSchema,
    'getModel': User
  };
}());

module.exports = userProvider;