var mongoose = require("mongoose");
require("dotenv").config();
const env = process.env;

var db = mongoose.connection;
mongoose.connect(env.srv, { useUnifiedTopology: true });
console.log("Connect ok");
db.on("error", console.error.bind(console, "DB connection error:"));
db.once("open", function () {
	// we're connected!
	console.log("DB connection successful");
	// console.log(server);
});

// User Schema

var admincontrols = mongoose.Schema({
	_id: Object,
	CandidateLive: Boolean,
	ClientLive: Boolean,
});

module.exports = mongoose.model(
	"admincontrols",
	admincontrols,
	"admincontrols"
);
