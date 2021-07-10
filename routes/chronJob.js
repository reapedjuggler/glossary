const axios = require("axios");
const router = require("express").Router();
const cron = require("node-cron");
const mongoose = require("mongoose");
const moment = require("node-moment");

const jobDetails = require("../models/cronjobData");
const User3 = require("../models/userModalC3");
const User = require("../models/userModel");
const ClientJobModel = require("../models/ClientJobModel");

const clientFxn = require("../models/jobDb").clientFxn;
const partnerFxn = require("../models/jobDb").partnerFxn;
const momatchUrl = "https://candidate.momatch.de/matches";
const matchMakingMail = require("./matchmakingMail");

const db = mongoose.connection;

var isValid = async () => {
	// check with the existing array that if jobs are changed or not if they are changed return true else return false;

	let prevCnt = await jobDetails.find().count();
	let newCnt = await ClientJobModel.find().count();

	console.log(prevCnt, "   ", newCnt, "\n\n Iam the count\n");

	return prevCnt !== newCnt;
};

router.post("/jobs/crondataupdate", async (req, res, next) => {
	var allUsers = await User.find({ activeJobSeeking: true }); // check for the active field activeJobSeeking --> true

	allUsers = allUsers.slice(0, 5); // change this and make this for all the users

	try {
		await allUsers.forEach(async ele => {
			var data = ele,
				prevId = ele._id;

			desiredPositions = data["desiredPositions"];

			let desiredJobDetails = [];

			if (desiredPositions !== null && desiredPositions.length > 0) {
				await desiredPositions.forEach(async ele => {
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
			}

			let allJobIds = [];

			for (let i = 0; i < desiredJobDetails.length; i++) {
				let jobId = await ClientJobModel.findOne({
					jobCode: desiredJobDetails[i],
				});

				allJobIds.push(jobId._id);
			}

			var jobStatisticsForC3 = await User3.findOne({ _id: ele._id });

			jobStatisticsForC3.applied = allJobIds;

			var momatchData = {};
			var candidate = {};
			candidate.city = data["city"];
			candidate.relocationWillingnessFlag = data["relocationWillingnessFlag"];
			candidate.careerLevel = data["careerLevel"];
			candidate.skills = data["skills"];
			candidate.languages = data["languages"];
			momatchData.candidate = candidate;

			// console.log(momatchData, "\niam the mo match data\n before request");

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

			jobStatisticsForC3.jobStatistics.partner = partnerData;
			jobStatisticsForC3.jobStatistics.client = clientData;

			// The combined field for which we will insert combined and applied

			jobStatisticsForC3.jobStatistics.combined_applied_preferred = []; // was first populated with "hello_this_is_testing"
			jobStatisticsForC3.jobStatistics.combined_applied_preferred = [
				...jobStatisticsForC3.jobStatistics.applied,
				...jobStatisticsForC3.jobStatistics.preferred,
			];

			var c3Data = {
				_id: prevId,
				jobStatistics: jobStatisticsForC3.jobStatistics,
			};

			var updResp = await User3.findOneAndUpdate(
				{ _id: prevId },
				{ $set: c3Data }
			);

			// console.log(updResp, " \nIam the updated Response\n");
		});

		res.send({ success: true, message: "Success" });
	} catch (err) {
		console.log(err, "\n\n Iam the error in cron");
		return { success: false, message: err };
	}
});

router.post("/jobs/cronjob", async (req, res, next) => {
	// running in every 2 days
	cron.schedule("*/20 * * * * *", async (req, res, next) => {
		try {
			var check = await isValid();

			if (check === true) {
				// if we have a new job we need to send notification to the user

				try {
					const resp = await axios.post(
						"http://localhost:3000/jobs/crondataupdate",
						{}
					);

					// console.log(resp.data, "\nIam teh resp after cron update\n\n");

					// update jobDetails model with the current jobs

					var prevJobs = [];

					prevJobs = await jobDetails.find({});

					// console.log(prevJobs, "Iam the orevJob\n");

					var allNewJobs = await ClientJobModel.find({
						_id: { $nin: prevJobs },
					});

					console.log(allNewJobs, "\n All the new Jobs\n");

					await allNewJobs.forEach(async ele => {
						let insertedDoc = await jobDetails.update(
							{ _id: ele._id },
							ele._id,
							{ upsert: true }
						);
						// console.log(insertedDoc, "\n\nIam the inserted Doc\n\n");
					});

					// console.log("\nAll done\n");
				} catch (err) {
					console.log(err, "\n Iam the error in cron\n");
					res.send({
						success: false,
						message: "Cron Job stopped due to error with axios",
					});
				}
			}
		} catch (err) {
			console.log(err);
			res.send({
				success: false,
				message: "Cron job stopped due to some error",
			});
		}
	});
});

// also make the deactivating the profule logic over here

router.post("/jobs/stopmatchmaking", async (req, res) => {
	// find all the users whose active job seeking is true and they are inactive for 3 months

	// db.gpsdatas.find({"createdAt" : { $gte : new ISODate("2012-01-12T20:15:31Z") }});

	// db.inventory.find( { $and: [ { price: { $ne: 1.99 } }, { price: { $exists: true } } ] } )

	// finding date which is older by 3months from today in mongodb
	try {
		var threeMonthsAgo = moment().subtract(3, "months");
		// console.log(threeMonthsAgo, "\n\n");
		console.log(threeMonthsAgo.format(), "\n\n");
		threeMonthsAgo = threeMonthsAgo.format();

		// threeMonthsAgo = isodate(threeMonthsAgo);

		console.log(threeMonthsAgo, "\n\n");

		const query = {
			$and: [
				{ activeJobSeeking: true },
				{
					"profileSecurity.lastProfileUpdateAt": {
						$lte: new Date(threeMonthsAgo),
					},
				},
			],
		};

		console.log(query, "\n\n Iam the query");

		const resp = await db.collection("Candidates_C1").find(query).toArray();

		resp.forEach(async ele => {
			// turn activeJobSeeking == false

			const updResp = await db
				.collection("Candidates_C1")
				.findOneAndUpdate(
					{ _id: ele._id },
					{ $set: { activeJobSeeking: false } }
				);

			await matchMakingMail(ele.email, ele.firstName + " " + ele.lastName);
		});

		console.log(resp, "\nIam the resp\n");
	} catch (err) {
		console.log(err, "\nIam err in deactivate\n");
		res.send("Error in cron");
	}
});

router.post("/jobs/deactivate", async (req, res, next) => {
	// now put deactivating the profile's logic over here
	// if anyone on the platform reg before 90 days	then switch activeJobSeeking --> false and mail them if still interested then click and activate again

	cron.schedule("*/20 * * * * *", async (req, res, next) => {
		console.log("Hi from 2 cron\n");
		const resp = await axios.post(
			"http://localhost:3000/jobs/stopmatchmaking",
			{}
		);

		console.log(resp.data, " Iam the resp in deactivating route");
	});
});

module.exports = router;
//  https://blog.logrocket.com/node-js-multithreading-what-are-worker-threads-and-why-do-they-matter-48ab102f8b10/

// const resp = await axios.post(momatchUrl, momatchData, {
// 	headers: { "Content-Type": "application/json" },
// });

// var momatzchResult = resp.data;

// var jobStatistics = {};
// jobStatistics.partner = momatchResult.partner;
// jobStatistics.client = momatchResult.client;
// jobStatistics.applied = desiredPositions;
// jobStatistics.shortlisted = [];
// jobStatistics.withdrawn = [];
// jobStatistics.rejected = [];
// jobStatistics.hired = [];
// jobStatistics.preferred = [];
// jobStatistics.recommended = [];

// // userData.jobStatistics = jobStatistics;
// var clientData = await clientFxn(momatchResult.client);
// var partnerData = await partnerFxn(momatchResult.partner);

// console.log(
// 	momatchResult,
// 	"\nIam the momatch\n",
// 	clientData,
// 	"\n\n",
// 	partnerData,
// 	"\n\n"
// );

// console.log("The client and partner data\n");
