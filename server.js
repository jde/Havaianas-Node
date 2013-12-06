/*jslint node:true, indent: 2*/
(function () {
  'use strict';
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
    database = require('./lib/database'),
    account = require('./lib/account'),
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
    if (profile.emails && profile.emails.length > 0) {
      // Retrieve the first email from profile.
      email = profile.emails[0].value;
      console.log('email=[%s]', email);

      // Search the database.
      account.getAccountByEmail(database, email, function (err, user) {
        // On error, return error.
        if (err !== null) {
          return done(err);
        }

        // If new account, create new account, pending approval.
        if (user === null) {
          account.createGoogleAccount(database, {'email': email, 'displayName': profile.displayName, 'identifier': identifier}, function (err, user) {
            // On error, return error.
            if (err !== null) {
              return done(err);
            }

            // Update the status.
            user.set('status', 'pending approval');

            // Save the user.
            account.saveAccount(user, function (err, user) {
              // On error, return error.
              if (err !== null) {
                return done(err);
              }

              // Return the user.
              return done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
            });
          });
        } else {
          // Account found.
          if (user.get('identifier') === null) {
            // Merge with local account.
            user.set('identifier', identifier);

            // Save the user.
            account.saveAccount(user, function (err, user) {
              // On error, return error.
              if (err !== null) {
                return done(err);
              }

              // Return the user.
              return done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
            });
          } else {
            // Default operations.
            return done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
          }
        }
      });
    } else {
      // Email is required.
      return done(null, false);
    }
  }));
  // Use the Local Strategy within Passport.
  passport.use(new LocalStrategy(function (username, password, done) {
    // Go to database.
    database.userModel.findOne({'email': username}, 'name password identifier', function (err, user) {
      if (err) {
        // Return the error directly.
        console.log('Error: err=[%s], user=[%s]', err, user);
        return done(err);
      }

      if (!user) {
        // User was not found.
        console.log('User not found. user=[%s]', user);
        return done(null, false, { message: 'Incorrect username.' });
      }

      // Need to check if the password match.
      if (passwordHash.verify(password, user.get('password')) === true) {
        done(null, {'id': user.get('_id'), 'displayName': user.get('name')});
      } else {
        // Password does not match.
        return done(null, false, { message: 'Incorrect password.' });
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

    // TODO: only allow accounts that are active.

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
  app.get('/index.html', function (req, res) {
    res.redirect('/');
  });
  app.get('/', function (req, res) {
    res.render('index', { user: req.user, flash: req.flash('error') });
  });
  // Show contact information.
  app.get('/contact', function (req, res) {
    res.render('contact', { user: req.user });
  });

  /*
   * Authentication methods.
   */
  // Google authentication.
  app.get('/auth/google',
    passport.authenticate('google', {'failureRedirect': '/logout'}), function (req, res) {
      res.redirect('/');
    });
  // Google authentication callback.
  app.get('/auth/google/return',
    passport.authenticate('google', {
      'successRedirect': '/account-status',
      'failureRedirect': '/logout'
    }));
  // Local authentication.
  app.post('/auth/local',
    passport.authenticate('local', {
      'successRedirect': '/app',
      'failureRedirect': '/',
      'failureFlash': 'Error authenticating user.'
    }));

  /*
   * Protected pages.
   */
  // Show the account information.
  app.get('/settings', ensureAuthenticated, function (req, res) {
    // Request the user from account.
    account.getAccountById(database, req.user.id, function (err, user) {
      console.log(JSON.stringify(user));
      res.render('settings', { 'user': req.user, 'account': user });
    });
  });
  // Show the account status information.
  app.get('/account-status', ensureAuthenticated, function (req, res) {
    account.getAccountById(database, req.user.id, function (err, db_user) {
      // Need to check the status.
      console.log('Return of google: is authenticated=[%s]', req.isAuthenticated());
      switch (db_user.get('status')) {
      case 'active':
        console.log('Account is active.');
        return res.redirect('/settings');
      case 'pending approval':
        console.log('Account is pending approval.');
        res.render('account/status_pending_approval', {'user': req.user});
        break;
      case 'approved':
        console.log('Account is approved.');
        res.render('account/status_approved', {'user': req.user});
        break;
      case 'disabled':
        console.log('Account is disabled.');
        res.render('account/status_disabled', {'user': req.user});
        break;
      default:
        console.log('Account has a invalid status');
        res.redirect('/logout');
      }
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