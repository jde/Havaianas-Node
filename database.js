/*jslint node:true, indent: 2*/
var
  database;

database = (function () {
  'use strict';
  var
    mongoose = require('mongoose'),
    connect,
    userSchema,
    User;

  connect = function (mongo_url) {
    var
      db;

    // Connect to database.
    mongoose.connect(mongo_url);
    db = mongoose.connection;

    // Setup listeners for errors.
    db.on('error', function (error) {
      console.log('Error connecting to database, error=[%s]', error);
    });
    db.on('open', function () {
      console.log('Database connection succesful');
    });
  };

  // Create the user schema.
  userSchema = new mongoose.Schema({
    'create': {
      'type': Date,
      'default': Date.now
    },
    'name': String,
    'email':  String,
    'password': String,
    'identifier': {
      'type': String,
      'default': null
    }
  });

  // Create the model.
  User = mongoose.model('user', userSchema);

  return {
    'connect': connect,
    'serSchema': userSchema,
    'userModel': User
  };
}());

module.exports = database;