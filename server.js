/*jslint node:true, indent: 2*/
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

  // Setup the database.
  mongo_string = 'mongodb://localhost/havaianas';
  database.connect(mongo_string);

  // Ensure user is authenticated.
  ensureAuthenticated = function (req, res, next) {
    // Checks if the request is authenticated.
    if (req.isAuthenticated() === true) {
      return next();
    }

    // Not authenticated, send to logout.
    res.redirect('/logout');
  };

  // To support persistent login sessions, Passport needs to be able to serialize users into and deserialize users out of the session. Typically, this will be as simple as storing the user ID when serializing, and finding the user by ID when deserializing. However, since this example does not have a database of user records, the complete Google profile is serialized and deserialized.
  passport.serializeUser(function (user, done) {
    console.log('serializeUser, user=[%s]', JSON.stringify(user));
    done(null, user);
  });
  passport.deserializeUser(function (obj, done) {
    console.log('deserializeUser, obj=[%s]', JSON.stringify(obj));
    done(null, obj);
  });

  // Use the GoogleStrategy within Passport.
  // Strategies in passport require a `validate` function, which accept credentials (in this case, an OpenID identifier and profile), and invoke a callback with a user object.
  passport.use(new GoogleStrategy({'returnURL': 'http://localhost:3000/auth/google/return', 'realm': 'http://localhost:3000/'}, function (identifier, profile, done) {
    // asynchronous verification, for effect.
    // To keep the example simple, the user's Google profile is returned to represent the logged-in user. In a typical application, you would want to associate the Google account with a user record in your database, and return that user instead.
    profile.identifier = identifier;
    return done(null, profile);
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

  // Home page.
  app.get('/', function (req, res) {
    res.render('index', { user: req.user });
  });
  // Show contact information.
  app.get('/contact', function (req, res) {
    res.render('contact', { user: req.user });
  });
  // Use passport.authenticate() as route middleware to authenticate the request. The first step in Google authentication will involve redirecting the user to google.com. After authenticating, Google will redirect the user back to this application at /auth/google/return
  app.get('/auth/google', passport.authenticate('google', {failureRedirect: '/logout'}), function (req, res) {
    res.redirect('/');
  });
  // Use passport.authenticate() as route middleware to authenticate the request. If authentication fails, the user will be redirected back to the login page. Otherwise, the primary route function function will be called, which, in this example, will redirect the user to the home page.
  app.get('/auth/google/return', passport.authenticate('google', {'successRedirect': '/app', 'failureRedirect': '/logout'}), function (req, res) {
    res.redirect('/');
  });
  // Perform the authentication against local credentials.
  app.post('/auth/local', passport.authenticate('local', {successRedirect: '/app', failureRedirect: '/logout'}), function (req, res) {
    var
      email,
      pass;

    // Retrieve the email from the form.
    email = req.param('email');
    pass = req.param('password');
    console.log('app.post, email=[%s], pass=[%s]', email, pass);
  });
  // Show the information regarding the account. It should only show when authenticated.
  app.get('/settings', ensureAuthenticated, function (req, res) {
    database.userModel.findOne({}, 'name email', function (err, user) {
      res.render('settings', { 'user': req.user, 'account': user });
    });
  });
  // Show contact information.
  app.get('/app', ensureAuthenticated, function (req, res) {
    res.render('app', { user: req.user });
  });
  // Perform the logout and redirect to home.
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  // Listen on port 3000.
  app.listen(3000);
}());