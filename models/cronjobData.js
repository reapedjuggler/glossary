const mongoose = require("mongoose");
require("dotenv").config();
const env = process.env;

var url = env.srv;

mongoose.connect(url, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
});

var cronJob = mongoose.Schema({
	Industries: {
		type: Array,
	},
	Skills: {
		type: Array,
	},
	shortlisted: {
		type: Array,
	},
	hired: {
		type: Array,
	},
	rejected: {
		type: Array,
	},
	jobTitle: {
		type: String,
	},
	jobUrl: {
		type: String,
	},
	requirements: {
		type: String,
	},
	description: {
		type: String,
	},
	careerLevel: {
		type: String,
	},
	Date: {
		type: String,
	},
	Languages: {
		type: Array,
	},
	workExperience: {
		type: Array,
	},
	city: {
		type: String,
	},
	country: {
		type: String,
	},
	currency: {
		type: String,
	},
	from: {
		type: String,
	},
	to: {
		type: String,
	},
	otherCountries: {
		type: Boolean,
	},
	timestamp: {
		type: Number,
	},
	ifDeleted: {
		type: Boolean,
	},
	jobCodeUnique: {
		type: Number,
	},
	jobCode: {
		type: String,
	},
});

module.exports = mongoose.model("cronjobs", cronJob, "cronjobs");
