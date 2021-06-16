var mongoose = require("mongoose");

var db = mongoose.connection;
mongoose.connect(
	"mongodb+srv://smurfette:rKvfAgK4AElQMw5C@cluster0.egtjb.mongodb.net/PROD?retryWrites=true&w=majority",
	{ useUnifiedTopology: true }
);
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
