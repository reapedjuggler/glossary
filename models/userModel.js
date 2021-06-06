var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var db = mongoose.connection;
  mongoose.connect('mongodb+srv://smurfette:rKvfAgK4AElQMw5C@cluster0.egtjb.mongodb.net/PROD?retryWrites=true&w=majority', { useUnifiedTopology: true });
  console.log('Connect ok');
  db.on('error', console.error.bind(console, 'DB connection error:'));
  db.once('open', function () {
      // we're connected!
      console.log("DB connection successful");
      // console.log(server);
  });


// User Schema
var CandidateSchema = mongoose.Schema({
	_id:{
		type:String
	},
	password: {
		type: String
	},
	email: {
		type: String
	},
	firstName: {
		type: String
	},
	lastName: {
		type: String
	},
	activeJobSeeking: {
		type: Boolean
	},
	termsAndPrivacyFlag: {
		type: Boolean
	},
	cvEnglish: {
		type: String
	},
	cvGerman: {
		type: String
	},
	country: {
		type: String
	},
	city: {
		type: String
	},
	visaType: {
		type: String
	},
	currentlyEmployedFlag: {
		type: Boolean
	},
	drivingPermitFlag: {
		type: Boolean
	},
	noticePeriod: {
		type: Number
	},
	contactNumber: {
		type: String
	},
	earliestJoiningDate: {
		type: String
	},
	relocationWillingnessFlag: {
		type: Boolean
	},
	countryPreferences: {
		type: Array
	},
	cityPreferences: {
		type: Array
	},
	desiredEmployment: {
		type: Object
	},
	onlineProfiles: {
		type: Object
	},
	desiredPositions: {
		type: Array
	},
	languages: {
		type: Array
	},
	skills: {
		type: Array
	},
	industries:{
		type: Array
	},
	workExperience:{
		type: Array
	},
	careerLevel:{
		type: String
	},
	createdAt:{
		type: Date
	},
	jobStatistics:{
		type: Object
	},
	jobComments:{
		type: Array
	},
	profileSecurity:{
		type: Object
	},
	helperInformation:{
		type: Object
	},
	cv:{
		type:Object
	}
});

var User = module.exports = mongoose.model('PROD0', CandidateSchema, 'Candidates_C1');

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}

module.exports.getUserByEmail = function(email, callback){
	var query = {email: email};
	User.findOne(query, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    	callback(null, isMatch);
	});
}

module.exports.createUser = function(newUser, callback){
	bcrypt.genSalt(10, function(err, salt) {
    	bcrypt.hash(newUser.profileSecurity.password, salt, function(err, hash) {
   			newUser.profileSecurity.password = hash;
   			newUser.save(callback);
    	});
	});
}