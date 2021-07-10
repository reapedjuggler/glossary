var mongoose = require("mongoose");
var bcrypt = require("bcryptjs");

require("dotenv").config();
const env = process.env;

var db = mongoose.connection;
mongoose.connect(env.srv, { useUnifiedTopology: true });
// console.log("Connect ok");
db.on("error", console.error.bind(console, "DB connection error:"));
db.once("open", function () {
	// we're connected!
	console.log("DB connection successful");
	// console.log(server);
});

// User Schema

var CandidateSchema3 = mongoose.Schema({
	_id: {
		type: String,
	},
	jobStatistics: {
		type: Object,
	},
});

var User = (module.exports = mongoose.model(
	"Candidate_C3",
	CandidateSchema3,
	"Candidates_C3"
));

module.exports.getUserById = function (id, callback) {
	User.findById(id, callback);
};

module.exports.getUserByEmail = function (email, callback) {
	var query = { email: email };
	User.findOne(query, callback);
};

module.exports.comparePassword = function (candidatePassword, hash, callback) {
	bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
		callback(null, isMatch);
	});
};

module.exports.createUser = function (newUser, callback) {
	bcrypt.genSalt(10, function (err, salt) {
		bcrypt.hash(newUser.profileSecurity.password, salt, function (err, hash) {
			newUser.profileSecurity.password = hash;
			newUser.save(callback);
		});
	});
};
