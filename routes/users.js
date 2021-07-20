var express = require("express");
var router = express.Router();
var expressValidator = require("express-validator");
const axios = require("axios");
var bcrypt = require("bcryptjs");
var crypto = require("crypto");
var fs = require("fs");
const base64 = require("js-base64");

// Aws mail service
var mail = require("./mail");
var mailForDelete = require("./mailDeleteProfile");
// Models
var User = require("../models/userModel");
var User2 = require("../models/userModalC2");
var User3 = require("../models/userModalC3");
var admin = require("../models/adminControl");
var Job = require("../models/ClientJobModel");

// Momatch and other data
var PartnerJobs = require("../models/PartnerJobModel");
var ClientJobs = require("../models/ClientJobModel");
const AWS = require("aws-sdk");
var mime = require("mime");
var clientFxn = require("../models/jobDb").clientFxn;
var partnerFxn = require("../models/jobDb").partnerFxn;
const { decode } = require("punycode");
const { resolve } = require("url");
const { ObjectID } = require("mongodb");
const { ObjectId } = require("mongodb");

// Configure client for use with Spaces
const spacesEndpoint = new AWS.Endpoint("fra1.digitaloceanspaces.com");
const s3 = new AWS.S3({
	endpoint: spacesEndpoint,
	accessKeyId: "ZGSAENDUVYA5FPKACAQQ",
	secretAccessKey: "I5ntx/15Yo4a0VFkVQ86UWv8ZD++8XrtvW3M5425Ym0",
});

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

router.post("/getcandidatestatus", async (req, res, next) => {
	try {
		const { id } = req.body;

		const resp = await admin.findOne({ _id: ObjectId(id) });

		// console.log(resp, "\nIam the status of Candidate");

		if (resp == null) {
			res.send({ success: false });
		} else {
			res.send({ success: true, message: resp.CandidateLive });
		}
	} catch (err) {
		console.log(err, "\n\nIam the err getcandidatesstatus\n");
		res.send({ success: false, message: "Error in finding status" });
	}
});

router.post("/login", function (req, res) {
	var email = req.body.email;

	var password = req.body.password;

	User.getUserByEmail(email, function (err, user) {
		if (err) {
			// console.log(err, "\nFirst err in logging in\n");
			throw err;
		}
		if (!user) {
			// console.log("No user with this email\n\n");
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
			// console.log("Loggin in \n");
			if (user.profileSecurity.dummyPassword == password) {
				// console.log("You are now logged in Succesfully!");
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

		let resp = await User.updateOne(
			{ email: email },
			{
				$set: {
					"profileSecurity.resetPasswordFlag": true, // we should not change it so that reset password works
					"profileSecurity.dummyPassword": tempPass,
				},
			}
		);

		mail(email, tempPass, email);

		// console.log(resp, "  ", "\n", email, "\nIam the user after upd\n\n");

		res.send({
			success: true,
			msg: "Password Mail Sent!",
		});
	} catch (err) {
		console.log(err, " \nIam the err occured in forgot password\n");
		res.send({
			success: false,
			err: err,
		});
	}
});

router.post("/resetpassword", async (req, res) => {
	try {
		var email = req.body.email;
		var newpassword = req.body.newpassword;
		var dummypassword = req.body.dummypassword;

		// console.log(candidate_id, " \n", newpassword, "\n", dummypassword, "\n\n");

		bcrypt.genSalt(10, function (err, salt) {
			bcrypt.hash(newpassword, salt, function (err, hash) {
				// console.log(hash);

				User.updateOne(
					{
						email: email,
						"profileSecurity.dummyPassword": dummypassword,
					},
					{
						$set: {
							"profileSecurity.password": hash,
							"profileSecurity.lastProfileUpdateAt": new Date(),
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

router.post("/setNewPassword", async (req, res) => {
	// first check if the user exist and

	try {
		let { id, oldPassword, newPassword, timeStamp } = req.body;

		let resp = await User.find({ _id: id });

		// console.log(resp, " \nThe required User\n");

		if (resp.length === 0) {
			res.send({
				success: true,
				msg: "No User with the specified email id please sign up to create your account",
			});
		}

		const password = resp[0].profileSecurity.password;

		const passwordValid = await bcrypt.compare(oldPassword, password);

		// console.log(passwordValid, " Iam the result for compare\n");

		if (!passwordValid) {
			throw new Error("Invalid Password");
		} else {
			// console.log("Everything good till here\n");

			bcrypt.genSalt(10, function (err, salt) {
				bcrypt.hash(newPassword, salt, async function (err, hash) {
					// Store hash in your password DB.

					resp[0].profileSecurity.password = hash;
					resp[0].profileSecurity.lastProfileUpdateAt = timeStamp;
					// console.log(hash, " \nNew Password\n\n");

					let updPassUser = await User.findOneAndUpdate(
						{ email: resp[0].email },
						{ $set: resp[0] }
					);

					res.send({ success: true, message: "Password Updated Successfully" });

					// console.log(updPassUser, "\n\nIam the updPassUser\n\n");
				});
			});
		}
	} catch (err) {
		// console.log(err, "\n\n-------------\n Iam error in setNewPassword");
		res.send({ success: false, msg: "Password was not updated" });
	}
});

router.post("/delete", async (req, res) => {
	var candidate_id = req.body.candidate_id;

	try {
		const resp = await User.findOne({ _id: candidate_id });

		if (resp) {
			// console.log(resp, " \n\n Iam resp");

			// we will delete it immediately from the db

			var fileNameEnglish = "No Data",
				fileNameGerman = "No Data";

			if (resp.cv.english === true) {
				fileNameEnglish =
					"https://spaces.moyyn.com/englishCVs/" + resp.cv.filename;
			}

			if (resp.cv.german === true) {
				fileNameGerman =
					"https://spaces.moyyn.com/germanCVs/" + resp.cv.filename;
			}

			await User.findOneAndDelete({ _id: candidate_id });
			await User2.findOneAndDelete({ _id: candidate_id });
			await User3.findOneAndDelete({ _id: candidate_id });

			// Name --> FirstName_LastName_hash(16digits)

			console.log(fileNameGerman, "  ", fileNameEnglish);

			const to = "talent@moyyn.com";

			// const to = "tomarvibhav55@gmail.com";

			mailForDelete(to, fileNameEnglish, fileNameGerman);

			res.send({ success: true, message: "Email has been sent" });
		} else {
			res.send({ success: false, message: "No Such User" });
		}
	} catch (err) {
		console.log(err, "\n\n");
		res.send({ success: false, message: "Error" });
	}
});

router.post("/getuser", async function (req, res) {
	var candidate_id = req.body.candidate_id;

	await User.findOne({ _id: candidate_id }, function (err, user) {
		if (err) {
			res.send(err);
		}
		// console.log(user);
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
					console.log("English pdf Saved");
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
		profileSecurity.lastProfileUpdateAt = new Date();

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

		let allJobIds = [];

		for (let i = 0; i < desiredJobDetails.length; i++) {
			let jobId = await Job.findOne({ jobCode: desiredJobDetails[i] });

			console.log(jobId, " \n Iam the job id\n");

			allJobIds.push(jobId._id);
		}

		///////////////////////////////////////////////////////////////////////////////

		var respFromC3 = await User3.findOne({ _id: prevId });

		if (respFromC3 === undefined) {
			res.send({ success: false, message: "User is undefined in C3" });
		}

		var jobStatisticsForC3 = respFromC3.jobStatistics;

		jobStatisticsForC3.applied = allJobIds;

		var momatchData = {};
		var candidate = {};
		candidate.city = city;
		candidate.relocationWillingnessFlag = relocationWillingnessFlag;
		candidate.careerLevel = careerLevel;
		candidate.skills = skills;
		candidate.languages = languages;
		momatchData.candidate = candidate;

		// var momatchResult = await momatchFxn(momatchData);
		// console.log(momatchResult);
		const resp = await axios.post(momatchUrl, momatchData, {
			headers: { "Content-Type": "application/json" },
		});
		var momatchResult = resp.data;

		// console.log(momatchResult, "\nIam the mo match data\n\n");

		var clientData = await clientFxn(momatchResult.client);
		var partnerData = await partnerFxn(momatchResult.partner);
		// console.log(partnerData);

		respFromC3.jobStatistics.partner = partnerData;
		respFromC3.jobStatistics.client = clientData;

		// The combined field for which we will insert combined and applied

		jobStatisticsForC3.combined_applied_preferred = [
			...jobStatisticsForC3.applied,
			...jobStatisticsForC3.preferred,
		];

		var c3Data = { _id: prevId, jobStatistics: jobStatisticsForC3 };

		let respAfterUpdFromC3 = await User3.findOneAndUpdate(
			{ _id: prevId },
			{ $set: c3Data }
		);

		// console.log(respAfterUpdFromC3, "\n\n Iam the resp from C2\n\n");

		// ////////////////////////////////////////////////////////////////    Updating in C2 and C3 also

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
			fs.writeFile(
				"cvData/German_CV/" + cvGerman.fileName,
				decodedBase64German,
				"binary",
				function (err) {
					if (err) {
						return console.log(err);
					}
					// console.log("German pdf saved in S3!");

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

		res.send({ success: true, message: "Profile updated" });
	} catch (err) {
		console.log(err, "\n\n----------------\nIam err\n");
		res.send({
			success: false,
			msg: "Error",
		});
	}
});

router.post("/application", function (req, res, next) {
	var email = req.body.email;

	User.getUserByEmail(email, function (err, user) {
		if (err) throw err;
		// console.log(user);
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
		console.log(candidate_id);

		let resp1 = await User3.findOne({ _id: candidate_id });

		// console.log(resp1);

		if (resp1 === null || resp1 === undefined) {
			res.send({ success: false, message: "No user found" });
			return;
		}

		const clientData = resp1.jobStatistics.client;
		const partnerData = resp1.jobStatistics.partner;

		// console.log(clientData, "     ", partnerData, "\n\n\n");

		var result = {
			success: true,
			candidate_id: candidate_id,
			email: resp1.email,
			suggestions: {
				client: clientData,
				partner: partnerData,
			},
		};

		res.send({ success: true, message: result });
	} catch (err) {
		console.log(err);
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
		// console.log(data, " \n-------------\nIam data\n\n");
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
		userData.createdAt = new Date();
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

		// console.log(
		// 	momatchResult,
		// 	"\nIam the momatch\n",
		// 	clientData,
		// 	"\n\n",
		// 	partnerData,
		// 	"\n\n"
		// );

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
			if (ele[ele.length - 1] == ")") {
				if (
					ele[ele.length - 2] === " " &&
					ele[ele.length - 3] >= "0" &&
					ele[ele.length - 3] <= "9"
				) {
					let dataFromJob = "";

					for (let i = ele.length - 3; ele[i] != " "; i--) {
						dataFromJob = ele[i] + dataFromJob;
					}

					if (dataFromJob.length) desiredJobDetails.push(dataFromJob);
				}
			}
		});

		let allJobIds = [];

		for (let i = 0; i < desiredJobDetails.length; i++) {
			let jobId = await Job.findOne({ jobCode: desiredJobDetails[i] });

			allJobIds.push(jobId._id);
		}

		jobStatistics.applied = allJobIds;

		jobStatistics.combined_applied_preferred = [];
		jobStatistics.combined_applied_preferred = [
			...jobStatistics.applied,
			...jobStatistics.preferred,
		];

		var dataFromCandidates_C2 = await User2.create(userTwoData);
		var dataFromCandidates_C3 = await User3.create({
			_id: mystr1,
			jobStatistics: jobStatistics,
		});

		User.createUser(newUserData, (err, resp) => {
			if (err) throw err;
			res.send({
				success: true,
				candidate_id: resp._id,
				email: resp.email,
				suggestions: {
					client: clientData,
					partner: partnerData,
				},
			});
		});
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

// {
//     "countryPreferences": ["Germany"],
//     "cityPreferences": ["Berlin", "Munich", "Hamburg-Nord", "Rostock", "Leipzig"],
//     "desiredPositions": ["HR Generalist (m/w/d) - BM21_1296"],
//     "languages": [{
//         "language": "German",
//         "level": "Native"
//     }, {
//         "language": "English",
//         "level": "Native"
//     }],
//     "skills": [".NET", ".NET Remoting", "Microsoft Windows Azure", "python", "c", "c++", "java", "php"],
//     "industries": ["Alternative Dispute Resolution"],
//     "workExperience": [{
//         "Category": "IT Operations",
//         "Role": "System Administrator",
//         "Experience": 4
//     }],
//     "firstName": "Aravinth",
//     "lastName": "Palaniswamy",
//     "email": "arvi@moyyn.de",
//     "activeJobSeeking": true,
//     "termsAndPrivacyFlag": true,
//     "relocationWillingnessFlag": true,
//     "desiredEmployment": {
//         "remote": false,
//         "partTime": false,
//         "fulltime": true,
//         "freelance": false
//     },
//     "onlineProfiles": {
//         "Stackoverflow": "",
//         "LinkedIn": "",
//         "Github": "",
//         "Xing": "",
//         "Dribbble": "",
//         "Behance": "",
//         "Other": ""
//     },
//     "country": "Germany",
//     "city": "Berlin",
//     "visaType": "Work Permit/Blue Card",
//     "earliestJoiningDate": "06-07-2021",
//     "currentlyEmployedFlag": false,
//     "drivingPermitFlag": false,
//     "contactNumber": "09442528900",
//     "noticePeriod": null,
//     "careerLevel": "Senior",
//     "createdAt": {
//         "$date": "2021-07-11T11:51:25.000Z"
//     },
//     "cv": {
//         "filename": "aravinth_palaniswamy_2f419a1901de1dd2.pdf",
//         "english": true,
//         "german": false
//     },
//     "profileSecurity": {
//         "ipHistory": [],
//         "lastProfileUpdateAt": {
//             "$date": "2021-07-20T08:01:35.849Z"
//         },
//         "lastDataRequestAt": null,
//         "emailVerificationFlag": false,
//         "resetPasswordFlag": false,
//         "password": "$2a$10$ikanZOZghfZd2JvNrMw3Gu.2P4SXdgF9EY8xl.2kBlJmtTTXdf0Zu"
//     },
//     "helperInformation": {
//         "source": "Node-App",
//         "profileCompleteFlag": true,
//         "formattedBy": "back-end",
//         "dataVerificationFlag": true
//     },
//     "__v": 0
// }