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
	jobs: Array,
});

module.exports = mongoose.model("cronjobs", cronJob, "cronjobs");
