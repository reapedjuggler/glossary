const mongoose = require("mongoose");
var bcrypt = require("bcryptjs");
require("dotenv").config();
const env = process.env;


var url = env.srv;

mongoose.connect(url, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
});

// User Schema
var CandidateSchema = mongoose.Schema({
	_id: {
		type: String,
	},
	password: {
		type: String,
	},
	email: {
		type: String,
	},
	firstName: {
		type: String,
	},
	lastName: {
		type: String,
	},
	activeJobSeeking: {
		type: Boolean,
	},
	termsAndPrivacyFlag: {
		type: Boolean,
	},
	cvEnglish: {
		type: String,
	},
	cvGerman: {
		type: String,
	},
	country: {
		type: String,
	},
	city: {
		type: String,
	},
	visaType: {
		type: String,
	},
	currentlyEmployedFlag: {
		type: Boolean,
	},
	drivingPermitFlag: {
		type: Boolean,
	},
	noticePeriod: {
		type: Number,
	},
	contactNumber: {
		type: String,
	},
	earliestJoiningDate: {
		type: Date,
	},
	relocationWillingnessFlag: {
		type: Boolean,
	},
	countryPreferences: {
		type: Array,
	},
	cityPreferences: {
		type: Array,
	},
	desiredEmployment: {
		type: Object,
	},
	onlineProfiles: {
		type: Object,
	},
	desiredPositions: {
		type: Array,
	},
	languages: {
		type: Array,
	},
	skills: {
		type: Array,
	},
	industries: {
		type: Array,
	},
	workExperience: {
		type: Array,
	},
	careerLevel: {
		type: String,
	},
	createdAt: {
		type: Date,
	},
	jobStatistics: {
		type: Object,
	},
	jobComments: {
		type: Array,
	},
	profileSecurity: {
		type: Object,
	},
	helperInformation: {
		type: Object,
	},
	cv: {
		type: Object,
	},
});

var newUser = (module.exports = mongoose.model(
	"Candidates_C1",
	CandidateSchema,
	"Candidates_C1"
));

module.exports.getUserById = function (id, callback) {
	newUser.findById(id, callback);
};

module.exports.getUserByEmail = function (email, callback) {
	var query = { email: email };
	newUser.findOne(query, callback);
};

module.exports.comparePassword = function (candidatePassword, hash, callback) {
	bcrypt.compare(candidatePassword, hash, function (err, isMatch) {
		callback(null, isMatch);
	});
};

module.exports.createUser = function (newUser, callback) {
	bcrypt.genSalt(10, function (err, salt) {
		bcrypt.hash(newUser.password, salt, function (err, hash) {
			newUser.password = hash;
			newUser.save(callback);
		});
	});
};
