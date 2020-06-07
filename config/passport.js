const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/user');
 const passportJWT = require("passport-jwt");
 const ExtractJWT = passportJWT.ExtractJwt;
 const JWTStrategy   = passportJWT.Strategy;


module.exports = function (passport) {

  passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey   : '4xmG4jzfCbqVbmuE'
},
function (jwtPayload, cb) {
    //find the user in db if needed. This functionality may be omitted if you store everything you'll need in JWT payload.
    return User.findOne({email:jwtPayload.email})
        .then(user => {
            return cb(null, user);
        })
        .catch(err => {
            return cb(err);
        });
}
));

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
  },(email, password, done) => {
    User.findOne({
      email: email
    }).then(user => {

      if (!user) {
        return done(null, false, { message: 'That email is not registered' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        // if (err) throw err;
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Password incorrect' });
        }
      });
    });
       
/*
      // Match user
      MongoClient.connect("mongodb+srv://" + config.mongouser + ":" + config.mongopwd + "@firstcluster-gw5fe.mongodb.net/test?retryWrites=true&w=majority", function (err, client) {
        var db = client.db('taskmanagement');
        db.collection("auth").findOne({ "email": email }).toArray(function (err, res) {
          if (err) {
            return done(null, false, { message: 'That email is not registered' });
          }
          // Match password
          bcrypt.compare(password, res[0].password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
              return done(null, res[0]);
            } else {
              return done(null, false, { message: 'Password incorrect' });
            }
          });

        });

      });
*/
    })
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
};
