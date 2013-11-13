/*jslint node:true, indent: 2*/
(function () {
  "use strict";
  var
    // Local authentication.
    passwordHash = require('password-hash'),
    // Database.
    mongo_string,
    database = require('./database'),
    // Read user input.
    readline = require('readline'),
    input = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    }),
    // User object.
    user,
    // Questions
    questionUser,
    questionEmail,
    questionPass;

  // Setup the database.
  mongo_string = 'mongodb://localhost/havaianas';
  database.connect(mongo_string);

  // Initialize the user object.
  user = new database.userModel();

  // Remove existent users.
  database.userModel.remove({}, function () {});

  // Display name.
  questionUser = function () {
    input.question('Display name: ', function (name) {
      // Need to check if display if valid.
      user.set('name', name);

      // Next question.
      questionEmail();
    });
  };

  // Email.
  questionEmail = function () {
    input.question('Email: ', function (email) {
      // Need to check if email if valid.
      user.set('email', email);

      // Next question.
      questionPass();
    });
  };

  // Pass.
  questionPass = function () {
    input.question('Password: ', function (password) {
      // Need to check if password if valid.
      user.set('password', passwordHash.generate(password, {'algorithm': 'sha1', 'saltLength': 8, 'iterations': 2}));
      console.log(user.get('password'));

      // Save user.
      user.save(function (err) {
        if (err !== null) {
          console.log('Error saving the user: error=[%s]', err);
          process.exit(-1);
        }

        // User created.
        console.log('User created.');
        process.exit(0);
      });
    });
  };

//  input.prompt();
  questionUser();
}());