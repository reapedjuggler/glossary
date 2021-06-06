// var mongoose = require('mongoose');
// var bcrypt = require('bcryptjs');
// var tunnel = require('tunnel-ssh');
// var fs = require('fs');

// var config = {
//   username: 'testing_match',
//   password: 'matchmaker',
//   host: '161.35.147.227',
//   port: 22,
//   dstPort: 27017,
// };
// var db = mongoose.connection;
// var server = tunnel(config, function (error, server) {
//   if (error) {
//       console.log("SSH connection error: " + error);
//   }
//   console.log('SSH ok');
//   mongoose.connect('mongodb://luigi:mOy9q3CzQdUZEH9N6CJyn@localhost:27017/moyyn?authSource=admin&readPreference=primary&ssl=false', {
//       auth: {
//           user: 'luigi',
//           password: 'mOy9q3CzQdUZEH9N6CJyn',
//           roles: [ { role: 'root', db: 'moyyn' } ]
//       }
//   });
//   console.log('Connect ok');
//   db.on('error', console.error.bind(console, 'DB connection error:'));
//   db.once('open', function () {
//       // we're connected!
//       console.log("DB connection successful");
//       // console.log(server);
//   });
//   //   .then(() => console.log('DB connection successful'))
//   //   .catch((error) => console.error.bind(console, 'DB connection error:'));
// });

// server.on('error', function(err){
//   console.error('Something bad happened:', err);
// });