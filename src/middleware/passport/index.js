import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

import config from '../../config';
import models from '../../model';

const passportHandler = passport.initialize()

passport.use('local', new LocalStrategy({
    usernameField: 'login',
    passwordField: 'password'
  }, 
  function (login, password, done) {
    //this one is typically a DB call. Assume that the returned user object is pre-formatted and ready for storing in JWT
    return models.User.findByLogin(login)
      .then(user => {
        if (!user) {
          return done(null, false, {message: 'Incorrect email or password.'});
        }
        user.validatePassword(password).then(res => {
          if (res) {
            done(null, user, {message: 'Logged In Successfully'})
          } else {
            done(null, false, {message: 'Incorrect email or password.'})
          }
        }).catch(err => done(err))
      })
      .catch(err => done(err));
  }
));

const authenticateUser = (req, res) => new Promise((resolve, reject) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) reject(err);
    resolve({ user, info });
  })(req, res);
});

var jwtOpts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.secret_key,
  ignoreExpiration: true,
};
passport.use('jwt', new JwtStrategy(jwtOpts, function(jwt_payload, done) {
  if (jwt_payload.exp <= Math.floor(Date.now() / 1000)) {
    return done({status: 401, message: 'jwt expired'}, false);
  }

  models.User.findByPk(jwt_payload.id).then(user => {
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  }).catch(err => {
    if (err) {
      return done(err, false);
    }
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  models.User.findById(id, function (err, user) {
    done(err, user);
  });
});

export default passportHandler;