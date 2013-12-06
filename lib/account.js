/*jslint node:true, indent: 2*/
var
  account;

account = (function () {
  'use strict';
  var
    validateUserDisplayName;

  // Validate the user display name: only characters, number and space.
  validateUserDisplayName = function (displayName) {
    if (displayName && displayName.length > 0) {
      return true;
    }
    return false;
  };

  // Return the object.
  return {
    'createLocalAccount': function (database, data, callback) {
      var
        user;

      // Check for required fields.
      if (!data.email && !validateUserDisplayName(data.displayName)) {
        return callback({'error': 'Email and Display Name are required'});
      }

      // Initialize the user object.
      user = new database.userModel();

      // Display name.
      user.set('name', data.displayName);

      // Email.
      user.set('email', data.email);

      // Set the initial status.
      user.set('status', 'active');

      // Save the user on database.
      user.save(function (err) {
        if (err !== null) {
          console.log('Error saving the user: error=[%s]', err);
          return callback(err);
        }

        // User created.
        callback(user);
      });
    },
    'createGoogleAccount': function (database, data, callback) {
      var
        user;

      // Check for required fields.
      if (!data.email && !data.displayName) {
        return callback({'error': 'Email and Display Name are required'});
      }

      // Initialize the user object.
      user = new database.userModel();

      // Display name.
      user.set('name', data.displayName);

      // Email.
      user.set('email', data.email);

      // Google identifier.
      if (data.identifier) {
        user.set('identifier', data.identifier);
      }

      // Set the initial status.
      user.set('status', 'disabled');

      // Save the user on database.
      user.save(function (err) {
        if (err !== null) {
          console.log('Error saving the user: error=[%s]', err);
          return callback(err, null);
        }

        // User created.
        callback(null, user);
      });
    },
    'getAccountById': function (database, id, callback) {
      // Search the database.
      database.userModel.findOne({'_id': id}, 'name email status', function (err, user) {
        // On error, return error.
        if (err !== null) {
          console.log('Error err=[%s]', err);
          return callback(err, null);
        }

        // Return the account.
        callback(null, user);
      });
    },
    'getAccountByEmail': function (database, email, callback) {
      // Search the database.
      database.userModel.findOne({'email': email}, 'name password identifier status', function (err, user) {
        // On error, return error.
        if (err !== null) {
          console.log('Error err=[%s]', err);
          return callback(err, null);
        }

        // Return the account.
        callback(null, user);
      });
    },
    'saveAccount': function (user, callback) {
      // Save the user on database.
      user.save(function (err) {
        if (err !== null) {
          console.log('Error saving the user: error=[%s]', err);
          return callback(err, null);
        }

        // User created.
        callback(null, user);
      });
    },
    'accountIsDisabled': function (user) {
      return user.get('status') === 'disabled';
    },
    'accountIsPendingApproval': function (user) {
      return user.get('status') === 'pending approval';
    },
    'accountIsApproved': function (user) {
      return user.get('status') === 'approved';
    },
    'accountIsActive': function (user) {
      return user.get('status') === 'active';
    }
  };

}());

/**
 * Expose object.
 */
module.exports = account;