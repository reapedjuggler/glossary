require("dotenv").config();
var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var session = require("express-session");
var expressValidator = require("express-validator");
var flash = require("connect-flash");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var db = mongoose.connection;

var routes = require("./routes/index");
var users = require("./routes/users");
var chronJob = require("./routes/chronJob");
var jobsRoute = require("./routes/jobsroute");

var app = express();

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

// Handle Sessions
app.use(
	session({
		secret: "secret",
		saveUninitialized: true,
		resave: true,
	})
);

app.use(cookieParser());

app.use(flash());
app.use(function (req, res, next) {
	res.locals.messages = require("express-messages")(req, res);
	next();
});

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept"
	);
	next();
});

app.use("/", users);
app.use("/", chronJob);
app.use("/", jobsRoute);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new Error("Not Found");
	err.status = 404;
	next(err);
});

// error handlers

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
	res.status(err.status || 500);
	res.send({ errorMessage: err });
});

var PORT = process.env.PORT;

app.listen(PORT, (req, res) => {
	console.log("Server running on " + PORT);
});

module.exports = app;
