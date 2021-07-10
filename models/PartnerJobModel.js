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

var PartnerJobSchema = mongoose.Schema({
	jobTitle: {
		type: String,
	},
	description: {
		type: String,
	},
	city: {
		type: String,
	},
	country: {
		type: String,
	},
	jobCode: {
		type: String,
	},
});

var PartnerJobs = (module.exports = mongoose.model(
	"partner_jobs",
	PartnerJobSchema,
	"partner_jobs"
));
