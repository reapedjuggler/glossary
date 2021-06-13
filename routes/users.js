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
var User2 = require("../models/userModalC2");
var User3 = require("../models/userModalC3");
var Job = require("../models/ClientJobModel");

var PartnerJobs = require("../models/PartnerJobModel");
var ClientJobs = require("../models/ClientJobModel");
const AWS = require("aws-sdk");
var mime = require("mime");
var clientFxn = require("../models/jobDb").clientFxn;
var partnerFxn = require("../models/jobDb").partnerFxn;
const { decode } = require("punycode");
const { resolve } = require("url");

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

// var getAllJobId = async (desiredJobDetails, getJobIds) => {
// 	return new Promise((resolve, reject) => {
// 		setTimeout(() => {
// 			let allDesiredJobs = [];

// 			if (desiredJobDetails.length > 0) {
// 				console.log("\n\n", desiredJobDetails, "\n\nInside the lloop\n");

// 				desiredJobDetails.forEach(async ele => {
// 					// every ele is a job code so we will find the id

// 					console.log(ele, " Hehe\n");

// 					var idForJobCode = await Job.findOne({ jobCode: ele });

// 					console.log(
// 						idForJobCode._id
// 						// "\n\nIam the corresponding id for this job code\n"
// 					);
// 					allDesiredJobs.push(idForJobCode._id);
// 					// console.log(allDesiredJobs, " iam the desired jobs\n");
// 				});
// 			}

// 			resolve(allDesiredJobs);
// 		}, 200);
// 	});
// };

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
		if (err) {
			console.log(err, "\nFirst err in logging in\n");
			throw err;
		}
		if (!user) {
			console.log("No user with this email\n\n");
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
			console.log("Loggin in \n");
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

router.post("/forgotpassword", async (req, res) => {
	var email = req.body.email;

	try {
		// console.log(email, "\n----------\nEmail\n");

		let tempPass = makeid(8);
		// console.log(resp, "\n\n", email, " \nI am the response\n");

		let user = await User.findOne({
			email: email,
		});

		mail(email, user.profileSecurity.dummyPassword, email);

		let resp = await User.updateOne(
			{ email: email },
			{
				$set: {
					"profileSecurity.resetPasswordFlag": true, // we should not change it so that reset password works
					"profileSecurity.dummyPassword": tempPass,
				},
			}
		);

		console.log(resp, "  ", "\n", email, "\nIam the user after upd\n\n");

		res.send({
			success: true,
			msg: "Password Mail Sent!",
		});
	} catch (err) {
		console.log(err, " \nIam the err occured\n");
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
		// console.log(data[0], " \n\n Iam dataaaa\n\n");
		// console.log(data[1], " \n\n Iam dataaaa at index 1\n\n");

		console.log("hello\n");

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

		let prevId = await User.find({ email: email });

		// console.log(
		// 	"\n\n\nhahah\n\n",
		// 	prevId,
		// 	"\n\n\nhehehe\n\n--------------\n\nId\n\n"
		// );

		prevId = prevId[0]._id;

		console.log(prevId, "\n\n Iam the id\n");

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

		// 14f6d4bd4d341cc28c28d7705db97afd3dd2b7f657da3c0fe2d074cc8dfbd60c"

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
		userData._id = prevId;

		var tempSec = await User.find({ email: email });

		// console.log(
		// 	"\n\nsecurity\n\n",
		// 	tempSec,
		// 	"\n\nI am prev Security \n\n"
		// );

		var profileSecurity = tempSec[0].profileSecurity;
		profileSecurity.lastProfileUpdateAt = event.toISOString();

		userData.profileSecurity = profileSecurity;

		var cv = {};

		// var engCheck, gerCheck;
		// engCheck = cvEnglish.data ? cvEnglish.data.substr(0, 24) : "";
		// gerCheck = cvGerman.data ? cvGerman.data.substr(0, 24) : "";

		//  && engCheck != "https://spaces.moyyn.com"

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

		// const resp = await axios.post(momatchUrl, momatchData, {
		// 	headers: { "Content-Type": "application/json" },
		// });

		// var momatchResult = resp.data;

		/////////////////////////////////////////////////////////////////    Update for C2 and C3

		// Job Statistics Part will be shifted to Candidates_C2


		let tempC2Data = await User2.findOne({ _id: prevId });

		tempC2Data.skills = skills;
		tempC2Data.earliestJoiningDate = earliestJoiningDate;
		tempC2Data.languages = languages;
		tempC2Data.industries = industries;
		tempC2Data.workExperience = workExperience;
		tempC2Data.careerLevel = careerLevel;

		// console.log(tempC2Data, " \n\n Iam the data in C2\n\n");

		let respAfterUpdFromC2 = await User2.findOneAndUpdate(
			{ _id: prevId },
			{ $set: tempC2Data }
		);

		// console.log(respAfterUpdFromC2, "\n\n Iam the resp from C2\n\n");

		// For C3 Collections and

		let desiredJobDetails = [];

		await desiredPositions.forEach(ele => {
			// every job
			// console.log(ele, "   ", ele[ele.length - 1], "  ", ele[ele.length - 3], "\nHehe iam ele\n");
			if (ele[ele.length - 1] == ")") {
				if (
					ele[ele.length - 2] === " " &&
					ele[ele.length - 3] >= "0" &&
					ele[ele.length - 3] <= "9"
				) {
					let dataFromJob = "";

					for (let i = ele.length - 3; ele[i] != " "; i--) {
						// console.log(ele[i], "   lol\n");
						dataFromJob = ele[i] + dataFromJob;
					}

					if (dataFromJob.length) desiredJobDetails.push(dataFromJob);
				}
			}
		});

		// console.log(desiredJobDetails, "\n\n Iam the job codes fetched\n");

		let allJobIds = [];

		for (let i = 0; i < desiredJobDetails.length; i++) {
			let jobId = await Job.findOne({ jobCode: desiredJobDetails[i] });

			console.log(jobId, " \n Iam the job id\n");

			allJobIds.push(jobId._id);
		}

		// console.log(allJobIds, "\n\n", prevId, "\n-----------------\nIam the job ids\n");

		///////////////////////////////////////////////////////////////////////////////


		var jobStatistics = await User3.findOne({_id: prevId});

		// console.log(jobStatistics, "\n\nIam the job Statistics\n");

		jobStatistics = jobStatistics.jobStatistics;

		// console.log(jobStatistics, "\n\nIam the job Statistics\n");

		jobStatistics.applied = allJobIds;

		// jobStatistics = jobStatistics.jobStatistics;

		var c3Data = {_id: prevId, jobStatistics: jobStatistics};

		let respAfterUpdFromC3 = await User3.findOneAndUpdate(
			{ _id: prevId },
			{$set : c3Data}
		);

		console.log(respAfterUpdFromC3, "\n\n Iam the resp from C2\n\n");

		////////////////////////////////////////////////////////////////    Updating in C2 and C3 also

		let resp2 = await User.findOneAndUpdate(
			{ email: email },
			{ $set: userData }
		);

		let tempCheck = "https://spaces.moyyn.com";

		// length --> 24

		if (
			cvEnglish.data !== null &&
			cvEnglish.data.substr(0, 24) != tempCheck &&
			cvEnglish.data.endsWith(".pdf") === false
		) {
			console.log("Iam inside English\n");
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
									Bucket: "production-moyyn",
									Key: "englishCVs/" + cvEnglish.fileName,
									Body: fileData,
									ACL: "public-read",
									ContentType: mime.getType("englishCVs/" + cvEnglish.fileName),
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

		if (
			cvGerman.data !== null &&
			cvGerman.data.substr(0, 24) != tempCheck &&
			cvGerman.data.endsWith(".pdf") === false
		) {
			console.log("Iam inside German\n");
			fs.writeFile(
				"cvData/German_CV/" + cvGerman.fileName,
				decodedBase64German,
				"binary",
				function (err) {
					if (err) {
						return console.log(err);
					}
					console.log("German pdf saved in S3!");

					fs.readFile(
						"cvData/German_CV/" + cvGerman.fileName,
						(err, fileData) => {
							s3.putObject(
								{
									Bucket: "production-moyyn",
									Key: "germanCVs/" + cvGerman.fileName,
									Body: fileData,
									ACL: "public-read",
									ContentType: mime.getType("germanCVs/" + cvGerman.fileName),
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

		// console.log(resp2, "\n------------\nI am the resp");

		res.send({ success: true, message: resp2 });
	} catch (err) {
		console.log(err, "\n\n----------------\nIam err\n");
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
				finalArr.push(`${job.jobTitle} ( ${job.jobCode} )`);
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
		User3.findOneAndUpdate(
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

			// console.log(clientData, "   \n\n", partnerData, " \nIam data part and client\n\n");

			let resp1 = await User3.findOne({ _id: candidate_id });

			resp1.jobStatistics.partner = partnerData;
			resp1.jobStatistics.client = clientData;

			User3.findOneAndUpdate({ _id: candidate_id }, { $set: resp1 });

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
		console.log(data, " \n-------------\nIam data\n\n");
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
									Bucket: "production-moyyn",
									Key: "englishCVs/" + cvEnglish.fileName,
									Body: fileData,
									ACL: "public-read",
									ContentType: mime.getType("englishCVs/" + cvEnglish.fileName),
								},
								(err, data) => {
									if (err) {
										console.log(err, "\n-------------\n Iam error ");
										throw err;
									}
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
									Bucket: "production-moyyn",
									Key: "germanCVs/" + cvGerman.fileName,
									Body: fileData,
									ACL: "public-read",
									ContentType: mime.getType("germanCVs/" + cvGerman.fileName),
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
		// userData.cvEnglish = cvEnglish.fileName;				// remove these
		// userData.cvGerman = cvGerman.fileName;
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
		// userData.jobComments = null;

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
		profileSecurity.emailVerificationFlag = false;
		profileSecurity.resetPasswordFlag = false;
		profileSecurity.password = password;
		userData.profileSecurity = profileSecurity;
		var helperInformation = {};
		helperInformation.source = "Node-App";
		helperInformation.profileCompleteFlag = true;
		helperInformation.formattedBy = "back-end";
		helperInformation.dataVerificationFlag = true;
		// helperInformation.dataVerificationFlag = false;
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

		// userData.jobStatistics = jobStatistics;
		var clientData = await clientFxn(momatchResult.client);
		var partnerData = await partnerFxn(momatchResult.partner);

		var newUserData = new User(userData);

		// Creating the entry in C2 and C3 too

		var userTwoData = {};

		userTwoData.activeJobSeeking = activeJobSeeking;
		userTwoData._id = mystr1;
		userTwoData.languages = languages;
		userTwoData.skills = skills;
		userTwoData.careerLevel = careerLevel;
		userTwoData.industries = industries;
		userTwoData.workExperience = workExperience;

		let desiredJobDetails = [];

		await desiredPositions.forEach(ele => {
			// every job
			// console.log(ele, "   ", ele[ele.length - 1], "  ", ele[ele.length - 3], "\nHehe iam ele\n");
			if (ele[ele.length - 1] == ")") {
				if (
					ele[ele.length - 2] === " " &&
					ele[ele.length - 3] >= "0" &&
					ele[ele.length - 3] <= "9"
				) {
					let dataFromJob = "";

					for (let i = ele.length - 3; ele[i] != " "; i--) {
						// console.log(ele[i], "   lol\n");
						dataFromJob = ele[i] + dataFromJob;
					}

					if (dataFromJob.length) desiredJobDetails.push(dataFromJob);
				}
			}
		});

		console.log(desiredJobDetails, "\n\n Iam the job codes fetched\n");

		let allJobIds = [];

		for (let i = 0; i < desiredJobDetails.length; i++) {
			let jobId = await Job.findOne({ jobCode: desiredJobDetails[i] });

			console.log(jobId, " \n Iam the job id\n");

			allJobIds.push(jobId._id);
		}

		console.log(allJobIds, "\n-----------------\nIam the job ids\n");

		jobStatistics.applied = allJobIds;

		var dataFromCandidates_C2 = await User2.create(userTwoData);
		var dataFromCandidates_C3 = await User3.create({
			_id: mystr1,
			jobStatistics: jobStatistics,
		});

		console.log(
			dataFromCandidates_C2,
			"\n\n-------------\n\ndata",
			dataFromCandidates_C3,
			"\n\n"
		);

		User.getUserByEmail(email, function (err, user) {
			if (err) throw err;
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
		// res.send({ success: true, message: "helo" });
	} catch (err) {
		console.log(err);
		res.send({
			success: false,
			errors: err,
		});
	}
});

module.exports = router;
// "_id": "60bdf90741eae6c801379758",
//   "email": "jdoe@gmail.com",
//   "firstName": "John",
//   "lastName": "Doe",
//   "activeJobSeeking": false,
//   "termsAndPrivacyFlag": true,
//   "country": "India",
//   "city": "Mumbai",
//   "visaType": "Non-eu Citizen",
//   "currentlyEmployedFlag": false,
//   "drivingPermitFlag": false,
//   "noticePeriod": "1",
//   "contactNumber": "08079060851",
//   "earliestJoiningDate": "code422",
//   "relocationWillingnessFlag": false,
//   "countryPreferences": [],
//   "cityPreferences": [],
//   "desiredEmployment": {
//     "remote": false,
//     "partTime": true,
//     "fulltime": false,
//     "freelance": true
//   },
//   "onlineProfiles": {
//     "Stackoverflow": "",
//     "LinkedIn": "",
//     "Github": "",
//     "Xing": "",
//     "Dribbble": "",
//     "Behance": "",
//     "Other": ""
//   },
//   "desiredPositions": [
//     "Backend Developer (m/w/x) - MO1797 - Talent Pool - Germany"
//   ],
//   "languages": [
//     {
//       "language": "English",
//       "level": "A1"
//     },
//     {
//       "language": "Hindi",
//       "level": "Native"
//     }
//   ],
//   "skills": [
//     "javascript",
//     "node.js"
//   ],
//   "industries": [
//     "Program Development"
//   ],
//   "workExperience": [
//     {
//       "category": "Software Development",
//       "role": "Node.js Developer",
//       "experience": {
//         "$numberInt": "1"
//       }
//     }
//   ],
//   "careerLevel": "Graduate",
//   "createdAt": "1616674917000",
//   "profileSecurity": {
//     "password": "ajhd23823j2h323",
//     "ipHistory": [],
//     "lastProfileUpdateAt": null,
//     "lastPasswordChangeAt": null,
//     "lastDataRequestAt": null,
//     "emailVerificationFlag": false,
//     "dummyPassword": "]<gAP#X$",
//     "resetPasswordFlag": true
//   },
//   "helperInformation": {
//     "source": "App",
//     "profileCompleteFlag": false,
//     "formattedBy": "Data Cleaning Script",
//     "dataVerificationFlag": false
//   },
//   "cv": {
//     "german": false,
//     "filename": "john_doe_bac963248a69af01.pdf",
//     "english": true
//   }

/* 
   "_id": "14f6d4bd4d341cc28c28d7705db97afd3dd2b7f657da3c0fe2d074cc8dfbd60c",
    "email": "tomarvibhav55@gmail.com",
    "firstName": "Vibhav",
    "lastName": "Tomar",
    "activeJobSeeking": true,
    "termsAndPrivacyFlag": true,
    "country": "India",
    "city": "New Delhi",
    "visaType": "Other",
    "currentlyEmployedFlag": false,
    "drivingPermitFlag": false,
    "noticePeriod": -1,
    "contactNumber": "+917000305373",
    "earliestJoiningDate": "code422",
    "relocationWillingnessFlag": false,
    "countryPreferences": [],
    "cityPreferences": [],
    "desiredEmployment": {
        "remote": true,
        "partTime": true,
        "fulltime": false,
        "freelance": false
    },
    "onlineProfiles": {
        "Stackoverflow": "",
        "LinkedIn": "https://www.linkedin.com/in/vibhav-tomar-883282178/",
        "Github": "",
        "Xing": "",
        "Dribbble": "",
        "Behance": "",
        "Other": ""
    },
    "desiredPositions": ["Backend Engineer (m/f/d) - node.js - BM21_101 - Berlin, Germany"],
    "languages": [{
        "language": "English",
        "level": "A2"
    }, {
        "language": "Hindi",
        "level": "Native"
    }],
    "skills": ["node.js", "mongodb"],
    "industries": ["Computer Software"],
    "workExperience": [{
        "category": "Software Development",
        "role": "Node.js Developer",
        "experience": 1
    }],
    "careerLevel": "Young Professional",
    "createdAt": {
        "$date": "2021-03-19T11:03:58.000Z"
    },
    "jobStatistics": {
        "applied": [],
        "partner": [],
        "client": [],
        "shortlisted": [],
        "withdrawn": [],
        "rejected": [],
        "hired": [],
        "preferred": [],
        "recommended": []
    },
    "jobComments": null,
    "profileSecurity": {
        "ipHistory": [],
        "lastProfileUpdateAt": "2021-06-03T19:02:07.624Z",
        "lastPasswordChangeAt": null,
        "lastDataRequestAt": null,
        "emailVerificationFlag": false,
        "dummyPassword": "YQo4EnYA",
        "resetPasswordFlag": true,
        "password": "$2a$10$dq7kUSOgM9LtAKApONxSReMvgsUcIry0YEP8UMPuMVV4NvW8RwptS"
    },
    "helperInformation": {
        "source": "App",
        "profileCompleteFlag": false,
        "formattedBy": "Data Cleaning Script",
        "dataVerificationFlag": false
    },
    "cv": {
        "german": false,
        "filename": "vibhav_tomar_3d7f3c7027da7274.pdf",
        "english": true
    }
*/
