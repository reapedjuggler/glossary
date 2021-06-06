var express = require("express");
var router = express.Router();
const axios = require("axios");
var expressValidator = require("express-validator");
var bcrypt = require("bcryptjs");
var crypto = require("crypto");
var fs = require("fs");
const base64 = require("js-base64");

var mail = require("./mail");

var User = require("../models/userModel");
var PartnerJobs = require("../models/PartnerJobModel");
var ClientJobs = require("../models/ClientJobModel");
const AWS = require("aws-sdk");
var mime = require("mime");
var clientFxn = require("../models/jobDb").clientFxn;
var partnerFxn = require("../models/jobDb").partnerFxn;
const { decode } = require("punycode");

// Configure client for use with Spaces
const spacesEndpoint = new AWS.Endpoint("fra1.digitaloceanspaces.com");
const s3 = new AWS.S3({
	endpoint: spacesEndpoint,
	accessKeyId: "ZGSAENDUVYA5FPKACAQQ",
	secretAccessKey: "I5ntx/15Yo4a0VFkVQ86UWv8ZD++8XrtvW3M5425Ym0",
});
const event = new Date();

router.use(expressValidator());
var momatchUrl = "https://candidate.momatch.de/matches";

//function to generate random strings
function makeid(length) {
	var result = [];
	var characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}[]().";
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result.push(
			characters.charAt(Math.floor(Math.random() * charactersLength))
		);
	}
	return result.join("");
}

// console.log(makeid(8));

var userData;

/* GET users listing. */
router.get("/", function (req, res, next) {
	res.send("Candidates Home page");
});

router.get("/register", function (req, res, next) {
	res.send(
		"This is GET register page, (send a POST request for registering user.)"
	);
});

router.get("/login", function (req, res, next) {
	res.send("This is the GET login page");
});

router.post("/login", function (req, res) {
	var email = req.body.email;
	var password = req.body.password;

	User.getUserByEmail(email, function (err, user) {
		if (err) throw err;
		if (!user) {
			res.send({
				success: false,
				msg: "Login Unsuccessful.",
			});
		} else if (user.profileSecurity.resetPasswordFlag == false) {
			//means the user has already set the password
			// console.log(user.profileSecurity.resetPasswordFlag);
			User.comparePassword(
				password,
				user.profileSecurity.password,
				function (err, isMatch) {
					if (err) return done(err);
					if (isMatch) {
						console.log("You are now logged in Succesfully!");
						userData = user;
						res.send({
							success: true,
							msg: "Logged in",
							candidate_id: user._id,
							email: user.email,
							resetpassFlag: user.profileSecurity.resetPasswordFlag,
							name: user.firstName + " " + user.lastName,
						});
					} else {
						res.send({
							success: false,
							msg: "Error in Logging in",
						});
					}
				}
			);
		} else {
			// console.log(user.profileSecurity.dummyPassword);
			if (user.profileSecurity.dummyPassword == password) {
				console.log("You are now logged in Succesfully!");
				userData = user;
				res.send({
					success: true,
					msg: "Logged in",
					candidate_id: user._id,
					email: user.email,
					resetpassFlag: user.profileSecurity.resetPasswordFlag,
					name: user.firstName + " " + user.lastName,
				});
			} else {
				res.send({
					success: false,
					msg: "Error in Logging in",
				});
			}
		}
	});
});

router.post("/forgotpassword", async function (req, res) {
	var email = req.body.email;
	try {
		await User.updateOne(
			{ email: email },
			{
				$set: {
					"profileSecurity.resetPasswordFlag": true,
					"profileSecurity.dummyPassword": makeid(8),
				},
			},
			function (err, user) {
				console.log("Dummy password updated");
			}
		);
		await User.findOne({ email: email }, function (err, user) {
			console.log(user);
			mail(email, user.profileSecurity.dummyPassword);
		});

		res.send({
			success: true,
			msg: "Password Mail Sent!",
		});
	} catch (err) {
		res.send({
			success: false,
			err: err,
		});
	}
});

router.post("/resetpassword", function (req, res) {
	try {
		var candidate_id = req.body.candidate_id;
		var newpassword = req.body.newpassword;
		var dummypassword = req.body.dummypassword;

		bcrypt.genSalt(10, function (err, salt) {
			bcrypt.hash(newpassword, salt, function (err, hash) {
				// console.log(hash);

				User.updateOne(
					{
						candidate_id: candidate_id,
						"profileSecurity.dummyPassword": dummypassword,
					},
					{
						$set: {
							"profileSecurity.password": hash,
							"profileSecurity.lastProfileUpdateAt": event.toISOString(),
							"profileSecurity.resetPasswordFlag": false,
						},
					},
					function (err, user) {
						if (err) throw err;
						// console.log(user)
						if (user.nModified == 0) {
							res.send({
								success: false,
								msg: "Unknown User",
							});
						} else {
							res.send({
								success: true,
								msg: "Updated Password",
							});
						}
					}
				);
			});
		});
	} catch (err) {
		res.send({
			success: false,
			err: err,
		});
	}
});

router.post("/delete", async function (req, res) {
	var candidate_id = req.body.candidate_id;

	await User.findByIdAndDelete(candidate_id, function (err, docs) {
		if (err) {
			res.send({
				success: false,
				error: err,
			});
		} else {
			res.send({
				success: true,
				msg: "Deleted Successfully.",
			});
		}
	});
});

router.post("/getuser", async function (req, res) {
	var candidate_id = req.body.candidate_id;

	await User.findOne({ _id: candidate_id }, function (err, user) {
		if (err) {
			res.send(err);
		}
		console.log(user);
		var result = [
			{
				Complete: true,
				firstname: user.firstName,
				lastname: user.lastName,
				email: user.email,
			},
			{
				Complete: true,
				cvEnglish: user.cv.english,
				cvGerman: user.cv.german,
				cv: user.cv.filename,
				desiredPositions: user.desiredPositions,
			},
			{
				Complete: true,
				country: user.country,
				city: user.city,
				visaType: user.visaType,
				currentlyEmployedFlag: user.currentlyEmployedFlag,
				drivingPermitFlag: user.drivingPermitFlag,
				noticePeriod: user.noticePeriod,
				contactNumber: user.contactNumber,
				earliestJoiningDate: user.earliestJoiningDate,
			},
			{
				Complete: true,
				relocationWillingnes: user.relocationWillingnessFlag,
				countryPreferences: user.countryPreferences,
				cityPreferences: user.cityPreferences,
				desiredEmployment: user.desiredEmployment,
				onlineProfiles: user.onlineProfiles,
			},
			{
				Complete: true,
				careerLevel: user.careerLevel,
				industries: user.industries,
				skills: user.skills,
				workExperience: user.workExperience,
				languages: user.languages,
			},
		];

		res.send(result);
	});
});

router.post("/editprofile", async function (req, res) {
	// var candidate_id = req.body.candidate_id;

	try {
		var data = req.body;
		// console.log(data[0]);
		var email = data[0].email;
		var firstName = data[0].firstname;
		var lastName = data[0].lastname;
		var cvEnglish = data[1].cvEnglish;
		var cvGerman = data[1].cvGerman;

		var mystr = crypto
			.createHash("sha256", "secret")
			.update(email)
			.digest("hex");

		var cvfirstName = firstName.replace(" ", "_");
		var cvlastName = lastName.replace(" ", "_");
		cvEnglish.fileName =
			cvfirstName.toLowerCase() +
			"_" +
			cvlastName.toLowerCase() +
			"_" +
			mystr.slice(0, 16) +
			".pdf";
		cvGerman.fileName =
			cvfirstName.toLowerCase() +
			"_" +
			cvlastName.toLowerCase() +
			"_" +
			mystr.slice(0, 16) +
			".pdf";

		// console.log(cvGerman.fileName);

		let decodedBase64English = "";
		let decodedBase64German = "";

		if (cvEnglish.data !== null)
			decodedBase64English = base64.atob(cvEnglish.data);
		if (cvGerman.data !== null)
			decodedBase64German = base64.atob(cvGerman.data);

		if (cvEnglish.data !== null) {
			fs.writeFile(
				"cvData/English_CV/" + cvEnglish.fileName,
				decodedBase64English,
				"binary",
				function (err, files) {
					if (err) {
						return console.log(err);
					}
					console.log(files);
				}
			);
		}

		if (cvGerman.data !== null) {
			fs.writeFile(
				"cvData/German_CV/" + cvGerman.fileName,
				decodedBase64German,
				"binary",
				function (err) {
					if (err) {
						return console.log(err);
					}
					console.log("German pdf saved!");
				}
			);
		}

		var desiredPositions = data[1].desiredPositions;
		var relocationWillingnessFlag = data[3].relocationWillingnes;
		var country = data[2].country;
		var city = data[2].city;
		var visaType = data[2].visaType;
		var earliestJoiningDate = data[2].earliestJoiningDate;
		var currentlyEmployedFlag = data[2].currentlyEmployedFlag;
		var drivingPermitFlag = data[2].drivingPermitFlag;
		var contactNumber = data[2].contactNumber;
		var noticePeriod = data[2].noticePeriod;
		var desiredEmployment = data[3].desiredEmployment;
		var careerLevel = data[4].careerLevel;
		var industries = data[4].industries;
		var skills = data[4].skills;
		var workExperience = data[4].workExperience;
		var languages = data[4].languages;
		var onlineProfiles = data[3].onlineProfiles;
		var cityPreferences = data[3].cityPreferences;
		var countryPreferences = data[3].countryPreferences;

		var userData = {};

		userData.firstName = firstName;
		userData.lastName = lastName;
		userData.email = email;
		userData.desiredPositions = desiredPositions;
		userData.relocationWillingnessFlag = relocationWillingnessFlag;
		userData.desiredEmployment = desiredEmployment;
		userData.onlineProfiles = onlineProfiles; //array of objects
		userData.country = country;
		userData.city = city;
		userData.visaType = visaType;
		userData.earliestJoiningDate = earliestJoiningDate;
		userData.currentlyEmployedFlag = currentlyEmployedFlag;
		userData.drivingPermitFlag = drivingPermitFlag;
		userData.cityPreferences = cityPreferences;
		userData.countryPreferences = countryPreferences;
		userData.contactNumber = contactNumber;
		userData.noticePeriod = noticePeriod;
		userData.careerLevel = careerLevel;
		userData.industries = industries;
		userData.skills = skills;
		userData.workExperience = workExperience;
		userData.languages = languages;
		var profileSecurity = {};
		profileSecurity.lastProfileUpdateAt = event.toISOString();
		userData.profileSecurity = profileSecurity;
		var cv = {};
		cv.filename = cvEnglish.fileName;
		cv.english = cvEnglish.data !== null ? true : false;
		cv.german = cvGerman.data !== null ? true : false;
		userData.cv = cv;

		var momatchData = {};
		var candidate = {};
		candidate.city = city;
		candidate.relocationWillingnessFlag = relocationWillingnessFlag;
		candidate.careerLevel = careerLevel;
		candidate.skills = skills;
		candidate.languages = languages;
		momatchData.candidate = candidate;
		// console.log(momatchData);

		// var momatchResult = await momatchFxn(momatchData);
		// console.log(momatchResult);
		const resp = await axios.post(momatchUrl, momatchData, {
			headers: { "Content-Type": "application/json" },
		});
		var momatchResult = resp.data;

		var jobStatistics = {};
		jobStatistics.partner = momatchResult.partner;
		jobStatistics.client = momatchResult.client;
		jobStatistics.applied = desiredPositions;
		jobStatistics.shortlisted = [];
		jobStatistics.withdrawn = [];
		jobStatistics.rejected = [];
		jobStatistics.hired = [];
		jobStatistics.preferred = [];
		jobStatistics.recommended = [];

		userData.jobStatistics = jobStatistics;

		console.log(userData);

		await User.updateOne(
			{ email: email },
			{ $set: userData },
			function (err, user) {
				res.send({
					success: true,
					msg: "Updated Successfully",
				});
			}
		);
	} catch (err) {
		res.send({
			success: false,
			msg: err,
		});
	}
});

router.post("/application", function (req, res, next) {
	var email = req.body.email;

	User.getUserByEmail(email, function (err, user) {
		if (err) throw err;
		console.log(user);
		if (user == null) {
			res.send({
				success: true,
				msg: "Account not found",
			});
		} else {
			res.send({
				success: false,
				msg: "Account found",
				name: user.firstName,
			});
		}
	});

	// Check Errors
	var errors = req.validationErrors();

	if (errors) {
		res.send({
			success: false,
			error: errors,
		});
	} else {
	}
});

router.post("/desiredjoblist", async function (req, res) {
	try {
		var finalArr = [];
		await PartnerJobs.find().then(jobs => {
			jobs.forEach(job => {
				// console.log(job.jobTitle)
				finalArr.push(job.jobTitle);
			});
		});
		await ClientJobs.find().then(jobs => {
			jobs.forEach(job => {
				// console.log(job.jobTitle)
				finalArr.push(job.jobTitle);
			});
		});

		res.send({
			success: true,
			data: finalArr,
		});
	} catch (err) {
		res.send({
			success: false,
			error: err,
		});
	}
});

router.post("/momatchflag", async function (req, res) {
	try {
		var candidate_id = req.body.candidate_id;
		var value = req.body.data;
		// console.log(value+"------------------------------------");
		User.findOneAndUpdate(
			{ _id: candidate_id },
			{ $set: { activeJobSeeking: value } }
		).then(async user => {
			// console.log(user);
			var msg;
			if (value) {
				msg = "enabled";
			} else {
				msg = "disabled";
			}

			res.send({
				success: true,
				msg: msg,
			});
		});
	} catch (err) {
		res.send({
			success: false,
			error: err,
		});
	}
});

router.post("/momatchflag/status", async function (req, res) {
	try {
		var candidate_id = req.body.candidate_id;
		// console.log(candidate_id);
		User.findOne({ _id: candidate_id }).then(async user => {
			// console.log(user.activeJobSeeking);

			res.send({
				success: true,
				momatchflag: user.activeJobSeeking,
			});
		});
	} catch (err) {
		res.send({
			success: false,
			error: err,
		});
	}
});

router.post("/preferences", async function (req, res) {
	try {
		var candidate_id = req.body.candidate_id;
		var jobs = req.body.jobs;
		// console.log(candidate_id);
		User.findOneAndUpdate(
			{ _id: candidate_id },
			{ $set: { "jobStatistics.preferred": jobs } }
		).then(async user => {
			// console.log(user);

			res.send({
				success: true,
				msg: "Data Saved",
			});
		});
	} catch (err) {
		res.send({
			success: false,
			error: err,
		});
	}
});

router.post("/jobs", async function (req, res) {
	try {
		var candidate_id = req.body.candidate_id;
		// console.log(candidate_id);
		User.findOne({ _id: candidate_id }).then(async user => {
			console.log(user.city);
			var momatchData = {};
			var candidate = {};
			candidate.city = user.city;
			candidate.relocationWillingnessFlag = user.relocationWillingnessFlag;
			candidate.careerLevel = user.careerLevel;
			candidate.skills = user.skills;
			candidate.languages = user.languages;
			momatchData.candidate = candidate;
			// console.log(momatchData);

			// var momatchResult = await momatchFxn(momatchData);
			// console.log(momatchResult);
			const resp = await axios.post(momatchUrl, momatchData, {
				headers: { "Content-Type": "application/json" },
			});
			var momatchResult = resp.data;
			console.log(momatchResult);
			// var test = ["1_CL_1_1"]
			var partnerJobs = [
				"BM21_905",
				"BM21_990",
				"BM21_991",
				"BM21_992",
				"BM21_993",
			];
			var clientData = await clientFxn(momatchResult.client);
			var partnerData = await partnerFxn(momatchResult.partner);
			// console.log(partnerData);

			var result = {
				success: true,
				candidate_id: candidate_id,
				email: user.email,
				suggestions: {
					client: clientData,
					partner: partnerData,
				},
			};

			res.send(result);
		});
	} catch (err) {
		res.send({
			success: false,
			error: err,
		});
	}
});

router.post("/register", async function (req, res, next) {
	// req.connection.setTimeout(100000);
	try {
		var data = req.body;
		// console.log(data[0].firstname);
		var firstName = data[0].firstname;
		var lastName = data[0].lastname;
		var email = data[0].email;
		var activeJobSeeking = data[0].activeJobSeeking;
		var termsAndPrivacyFlag = data[0].termsAndPrivacyFlag;
		var password = data[0].password;

		var cvEnglish = data[1].cvEnglish;
		var cvGerman = data[1].cvGerman;

		var mystr = crypto
			.createHash("sha256", "secret")
			.update(email)
			.digest("hex");

		// john_doe_fg3478g34734834.pdf
		// console.log(mystr);
		var cvfirstName = firstName.replace(" ", "_");
		var cvlastName = lastName.replace(" ", "_");
		cvEnglish.fileName =
			cvfirstName.toLowerCase() +
			"_" +
			cvlastName.toLowerCase() +
			"_" +
			mystr.slice(0, 16) +
			".pdf";
		cvGerman.fileName =
			cvfirstName.toLowerCase() +
			"_" +
			cvlastName.toLowerCase() +
			"_" +
			mystr.slice(0, 16) +
			".pdf";

		let decodedBase64English = "";
		let decodedBase64German = "";

		if (cvEnglish.data !== null)
			decodedBase64English = base64.atob(cvEnglish.data);
		if (cvGerman.data !== null)
			decodedBase64German = base64.atob(cvGerman.data);

		if (cvEnglish.data !== null) {
			fs.writeFile(
				"cvData/English_CV/" + cvEnglish.fileName,
				decodedBase64English,
				"binary",
				function (err) {
					if (err) {
						return console.log(err);
					}
					console.log("English pdf saved!");

					fs.readFile(
						"cvData/English_CV/" + cvEnglish.fileName,
						(err, fileData) => {
							console.log(
								fileData,
								"\n------------\n\n",
								decodedBase64English,
								"\n---------------\n\n"
							);

							s3.putObject(
								{
									Bucket: "prod-moyyn",
									Key: "English_CV/" + cvEnglish.fileName,
									Body: fileData,
									ACL: "public-read",
									ContentType: mime.getType("English_CV/" + cvEnglish.fileName),
								},
								(err, data) => {
									if (err) throw err;
									cvEnglish.fileName = cvEnglish.fileName;
									console.log(data);
								}
							);
						}
					);
				}
			);
		}

		if (cvGerman.data !== null) {
			fs.writeFile(
				"cvData/German_CV/" + cvGerman.fileName,
				decodedBase64German,
				"binary",
				function (err) {
					if (err) {
						return console.log(err);
					}
					console.log("German pdf saved!");

					fs.readFile(
						"cvData/German_CV/" + cvGerman.fileName,
						(err, fileData) => {
							s3.putObject(
								{
									Bucket: "prod-moyyn",
									Key: "German_CV/" + cvGerman.fileName,
									Body: fileData,
									ACL: "public-read",
									ContentType: mime.getType("German_CV/" + cvGerman.fileName),
								},
								(err, data) => {
									if (err) throw err;
									cvGerman.fileName = cvGerman.fileName;
									console.log(data);
								}
							);
						}
					);
				}
			);
		}

		var desiredPositions = data[1].desiredPositions;
		var relocationWillingnessFlag = data[3].relocationWillingnes;
		var country = data[2].country;
		var city = data[2].city;
		var visaType = data[2].visaType;
		var earliestJoiningDate = data[2].earliestJoiningDate;
		var currentlyEmployedFlag = data[2].currentlyEmployedFlag;
		var drivingPermitFlag = data[2].drivingPermitFlag;
		var contactNumber = data[2].contactNumber;
		var noticePeriod = data[2].noticePeriod;
		var desiredEmployment = data[3].desiredEmployment;
		var careerLevel = data[4].careerLevel;
		var industries = data[4].industries;
		var skills = data[4].skills;
		var workExperience = data[4].workExperience;
		var languages = data[4].languages;
		var onlineProfiles = data[3].onlineProfiles;
		var cityPreferences = data[3].cityPreferences;
		var countryPreferences = data[3].countryPreferences;

		var userData = {};
		var mystr1 = crypto
			.createHash("sha256", "secret")
			.update(email)
			.digest("hex");

		userData._id = mystr1;
		userData.firstName = firstName;
		userData.lastName = lastName;
		userData.email = email;
		userData.activeJobSeeking = activeJobSeeking;
		userData.termsAndPrivacyFlag = termsAndPrivacyFlag;
		// userData.password = password;
		userData.cvEnglish = cvEnglish.fileName;
		userData.cvGerman = cvGerman.fileName;
		userData.desiredPositions = desiredPositions;
		userData.relocationWillingnessFlag = relocationWillingnessFlag;
		userData.desiredEmployment = desiredEmployment;
		userData.onlineProfiles = onlineProfiles; //array of objects
		userData.country = country;
		userData.city = city;
		userData.visaType = visaType;
		userData.earliestJoiningDate = earliestJoiningDate;
		userData.currentlyEmployedFlag = currentlyEmployedFlag;
		userData.drivingPermitFlag = drivingPermitFlag;
		userData.cityPreferences = cityPreferences;
		userData.countryPreferences = countryPreferences;
		userData.contactNumber = contactNumber;
		userData.noticePeriod = noticePeriod;
		userData.careerLevel = careerLevel;
		userData.industries = industries;
		userData.skills = skills;
		userData.workExperience = workExperience;
		userData.languages = languages;
		userData.createdAt = event.toISOString();
		userData.jobComments = null;

		var cv = {};
		cv.filename = cvEnglish.fileName;
		if (cvEnglish.data !== null) {
			cv.english = true;
		} else {
			cv.english = false;
		}
		if (cvGerman.data !== null) {
			cv.german = true;
		} else {
			cv.german = false;
		}
		userData.cv = cv;

		var profileSecurity = {};
		var ipHistoryArr = [];
		profileSecurity.ipHistory = ipHistoryArr;
		profileSecurity.lastProfileUpdateAt = null;
		profileSecurity.lastDataRequestAt = null;
		profileSecurity.dataVerificationFlag = false;
		profileSecurity.resetPasswordFlag = false;
		profileSecurity.password = password;
		userData.profileSecurity = profileSecurity;
		var helperInformation = {};
		helperInformation.source = "Forms";
		helperInformation.profileCompleteFlag = false;
		helperInformation.formattedBy = "Data Cleaning Script";
		helperInformation.dataVerificationFlag = false;
		userData.helperInformation = helperInformation;

		var momatchData = {};
		var candidate = {};
		candidate.city = city;
		candidate.relocationWillingnessFlag = relocationWillingnessFlag;
		candidate.careerLevel = careerLevel;
		candidate.skills = skills;
		candidate.languages = languages;
		momatchData.candidate = candidate;
		// console.log(momatchData);

		// var momatchResult = await momatchFxn(momatchData);
		// console.log(momatchResult);
		const resp = await axios.post(momatchUrl, momatchData, {
			headers: { "Content-Type": "application/json" },
		});
		var momatchResult = resp.data;

		var jobStatistics = {};
		jobStatistics.partner = momatchResult.partner;
		jobStatistics.client = momatchResult.client;
		jobStatistics.applied = desiredPositions;
		jobStatistics.shortlisted = [];
		jobStatistics.withdrawn = [];
		jobStatistics.rejected = [];
		jobStatistics.hired = [];
		jobStatistics.preferred = [];
		jobStatistics.recommended = [];

		userData.jobStatistics = jobStatistics;
		var clientData = await clientFxn(momatchResult.client);
		var partnerData = await partnerFxn(momatchResult.partner);

		var newUserData = new User(userData);
		User.getUserByEmail(email, function (err, user) {
			if (err) throw err;
			// console.log(user);
			if (user == null) {
				console.log("New User");
				User.createUser(newUserData, function (err, user) {
					if (err) throw err;
					userData = user;
					console.log(user);
					res.send({
						success: true,
						candidate_id: user._id,
						email: user.email,
						suggestions: {
							client: clientData,
							partner: partnerData,
						},
					});
				});
			} else {
				res.send({
					success: false,
					msg: "Account already exists!",
					name: user.firstName,
				});
			}
		});
	} catch (err) {
		res.send({
			success: false,
			errors: err,
		});
	}
});

module.exports = router;
