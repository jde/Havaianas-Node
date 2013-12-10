/*jslint node:true, indent: 2*/
var
  database;

database = (function () {
  'use strict';
  var
    mongoose = require('mongoose'),
    connect,
    // Schemas.
    userSchema,
    resourceSchema,
    roleSchema,
    // Models.
    User,
    Resource,
    Role;

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

  //
  // Authorization
  //

  // Resources schema.
  resourceSchema = new mongoose.Schema({
    'label': {
      'type': String,
      'default': ''
    },
    'url': {
      'type': String,
      'default': ''
    }
  });

  // Roles schema.
  roleSchema = new mongoose.Schema({
    'label': {
      'type': String,
      'trim': true
    },
    'access': {
      'type': Array,
      'default': []
    },
    'resources': [resourceSchema]
  });

  //
  // Authentication
  //

  // User schema.
  userSchema = new mongoose.Schema({
    'create': {
      'type': Date,
      'default': Date.now
    },
    'name': String,
    'email':  String,
    'password': {
      'type': String,
      'default': null
    },
    'status': {
      'type': String,
      'default': 'disabled'
    },
    'identifier': {
      'type': String,
      'default': null
    },
    'roles': [roleSchema]
  });

  // Create the model.
  User = mongoose.model('user', userSchema);
  Resource = mongoose.model('resource', resourceSchema);
  Role = mongoose.model('role', roleSchema);

  return {
    'connect': connect,
    'userModel': User,
    'resourceModel': Resource,
    'roleModel': Role
  };
}());

module.exports = database;