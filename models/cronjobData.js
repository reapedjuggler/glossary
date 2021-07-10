const mongoose = require("mongoose");
require("dotenv").config();
const env = process.env;

// var url =
// 	"mongodb+srv://smurfette:rKvfAgK4AElQMw5C@cluster0.egtjb.mongodb.net/PROD?retryWrites=true&w=majority";

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
