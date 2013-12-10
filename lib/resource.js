/*jslint node:true, indent: 2*/
var
  resources;

resources = (function () {
  'use strict';

  return {
    'list': function (database, callback) {
      // Retrieve all the users.
      database.resourceModel.find({}, 'label url', function (error, results) {
        callback(error, results);
      })
        .sort('label');
    },
    'get': function (database, id, callback) {
      // Search the database.
      database.resourceModel.findOne({'_id': id}, 'label url', function (err, resource) {
        // On error, return error.
        if (err !== null) {
          console.log('Error err=[%s]', err);
          return callback(err, null);
        }

        // Return the account.
        callback(null, resource);
      });
    }
  };
}());

/**
 * Expose object.
 */
module.exports = resources;