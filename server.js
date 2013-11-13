/*jslint node:true, indent: 2*/
/*jshint sub:true*/
(function () {
  "use strict";
  var
    // Express framework.
    express = require('express'),
    // Authentication.
    passport = require('passport'),
    GoogleStrategy = require('passport-google').Strategy,
    LocalStrategy = require('passport-local').Strategy,
    // Local authentication.
    passwordHash = require('password-hash'),
    // Database.
    mongo_string,
    database = require('./database'),
    // Utility method to verify authenticaton.
    ensureAuthenticated,
    // The express application.
    app;

  /*
   * Database connection.
   */
  // Setup the database.
  mongo_string = 'mongodb://localhost/havaianas';
  database.connect(mongo_string);

  /*
   * Authentication strategies.
   */
  // Use the GoogleStrategy within Passport.
  passport.use(new GoogleStrategy({'returnURL': 'http://localhost:3000/auth/google/return', 'realm': 'http://localhost:3000/'}, function (identifier, profile, done) {
    var
      email = null;

    // Check against database.
    if (profile['emails'] && profile['emails'].length > 0) {
      // Retrieve the email from profile..
      email = profile['emails'][0]['value'];
      console.log('email=[%s]', email);

      // Search the database.
      database.userModel.findOne({'email': email}, 'name password identifier', function (err, user) {
        // On error, return error.
        if (err !== null) {
          console.log('Error err=[%s]', err);
          return done(err);
        }

        // => If new account, create new account.
        if (user === null) {
          // Initialize the user object.
          user = new database.userModel();

          // Display name.
          user.set('name', profile['displayName']);

          // Email.
          user.set('email', email);

          // Set the identifier.
          user.set('identifier', identifier);

          // Save the user on database.
          user.save(function (err) {
            if (err !== null) {
              console.log('Error saving the user: error=[%s]', err);
              return done(null, false);
            }

            // User created.
            console.log('User created.');
            return done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
          });
        } else {
          // User found on database but not Google, merge.
          if (user.get('identifier') === null) {
            // Add the identifier to the user.
            user.set('identifier', identifier);

            // Saves it.
            user.save(function (err) {
              if (err !== null) {
                console.log('Error saving the user: error=[%s]', err);
                return done(null, false);
              }

              // User created.
              console.log('User created.');
              return done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
            });
          } else {
            // Just a normal and .
            return done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
          }
        }
      });
    } else {
      // Missing email.
      return done(null, false);
    }
  }));
  // Use the Local Strategy within Passport.
  passport.use(new LocalStrategy(function (username, password, done) {
    // Go to database.
    database.userModel.findOne({'email': username}, 'name password identifier', function (err, user) {
      // On error or if no user found, return error.
      if (err !== null || user === null) {
        console.log('Error or user not found. err=[%s], user=[%s]', err, user);
        return done(err);
      }

      // Need to check if the password match.
      if (passwordHash.verify(password, user.get('password')) === true) {
        done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
      } else {
        done(null, false);
      }
    });
    console.log('username=[%s], password=[%s]', username, password);
  }));
  // To support persistent login sessions, Passport needs to be able to serialize users into and deserialize users out of the session. Typically, this will be as simple as storing the user ID when serializing, and finding the user by ID when deserializing. However, since this example does not have a database of user records, the complete Google profile is serialized and deserialized.
  passport.serializeUser(function (user, done) {
    console.log('serializeUser, user=[%s]', JSON.stringify(user));
    return done(null, user);
  });
  passport.deserializeUser(function (obj, done) {
    console.log('deserializeUser, obj=[%s]', JSON.stringify(obj));
    return done(null, obj);
  });
  // Ensure user is authenticated.
  ensureAuthenticated = function (req, res, next) {
    // Checks if the request is authenticated.
    if (req.isAuthenticated() === true) {
      return next();
    }

    // Not authenticated, send to logout.
    res.redirect('/logout');
  };

  /*
   * Express setup.
   */
  // Create server.
  app = express.createServer();
  // Configure Express
  app.configure(function () {
    // Setup the Template Engine.
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');

    // Values are 'default', 'short', 'tiny', 'dev'
    app.use(express.logger('dev'));

    // Parses the Cookie header field and populates req.cookies with an object keyed by the cookie names.
    // -> Optionally you may enabled signed cookie support by passing a secret string.
    // app.use(express.cookieParser('secret'));
    app.use(express.cookieParser());

    // Request body parsing middleware supporting JSON, urlencoded, and multipart requests. This middleware is simply a wrapper the json(), urlencoded(), and multipart() middleware.
    app.use(express.bodyParser());

    app.use(express.methodOverride());
    app.use(express.session({ secret: 'keyboard cat' }));

    // Initialize Passport! Also use passport.session() middleware, to support persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session());

    // Routing system.
    app.use(app.router);

    // Public files.
    app.use(express['static'](__dirname + '/public'));
  });

  /*
   * Open site.
   */
  // Home page.
  app.get('/', function (req, res) {
    res.render('index', { user: req.user });
  });
  // Show contact information.
  app.get('/contact', function (req, res) {
    res.render('contact', { user: req.user });
  });

  /*
   * Authentication methods.
   */
  // Go to Google requesting authentication.
  app.get('/auth/google', passport.authenticate('google', {failureRedirect: '/logout'}), function (req, res) {
    res.redirect('/');
  });
  // Google return url after authentication.
  app.get('/auth/google/return', passport.authenticate('google', {'successRedirect': '/app', 'failureRedirect': '/logout'}), function (req, res) {
    res.redirect('/');
  });
  // Local authentication.
  app.post('/auth/local', passport.authenticate('local', {successRedirect: '/app', failureRedirect: '/logout'}), function (req, res) {
    var
      email,
      pass;

    // Retrieve the email from the form.
    email = req.param('email');
    pass = req.param('password');
    console.log('app.post, email=[%s], pass=[%s]', email, pass);
  });

  /*
   * Protected pages.
   */
  // Show the information regarding the account.
  app.get('/settings', ensureAuthenticated, function (req, res) {
    database.userModel.findOne({}, 'name email', function (err, user) {
      res.render('settings', { 'user': req.user, 'account': user });
    });
  });
  // This is the application itself.
  app.get('/app', ensureAuthenticated, function (req, res) {
    res.render('app', { user: req.user });
  });

  /*
   * Logout pages.
   */
  // Perform the logout.
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  // Listen on port 3000.
  app.listen(3000);
}());