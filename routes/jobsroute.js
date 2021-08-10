const express = require("express");
const router = express.Router();

const jobModal = require("../models/ClientJobModel");
const User1 = require("../models/userModel");
const User2 = require("../models/userModalC2");
const User3 = require("../models/userModalC3");

// Get all the jobs
router.post("/jobs/allclientjobs", async function (req, res) {
	try {
		var data = await jobModal.find({});

		res.send({
			success: true,
			data: data,
		});
	} catch (err) {
		res.send({
			success: false,
			error: "Error in getting all client jobs",
		});
	}
});

// Gets all the job for a particular user
router.post("/jobs/getalljobs", async (req, res, next) => {
	console.log("Inside the jobs route\n");

	try {
		const { candidate_id } = req.body;

		const resp = await User1.findOne({ _id: candidate_id });

		res.send({ success: true, message: resp.client });
	} catch (err) {
		console.log("Error in jobs/getalljobs\n");
		res.send({ success: false, message: err.message });
	}
});

router.post("/jobs/getjobwithjobid", async (req, res, next) => {
	console.log("Inside the jobs route\n");

	try {
		const { jobId } = req.body;

		const resp = await jobModal.findOne({ _id: jobId });

		res.send({ success: true, message: resp });
	} catch (err) {
		console.log("Error in jobs/getjobwithjobId\n");
		res.send({ success: false, message: err.message });
	}
});

// Apply for a client job
router.post("/jobs/applyforjob", async (req, res) => {
	console.log("Inside the applyforjob route\n");

	try {
		const { candidate_id, jobId } = req.body;

		console.log(candidate_id, "  ", jobId);

		const prevResp = await User3.findOne({ _id: candidate_id });

		if (prevResp === null) {
			res.send({ success: true, message: "No such user with this user id" });
		} else {
			const dataToSet = prevResp;

			// console.log(dataToSet, "\n");

			dataToSet.jobStatistics.applied.push(jobId);

			var temp = [];

			temp = [...temp, ...dataToSet.jobStatistics.applied];

			temp = [...temp, ...dataToSet.jobStatistics.preferred];

			dataToSet.jobStatistics.combined_applied_preferred = temp;

			await User3.findOneAndUpdate({ _id: candidate_id }, { $set: dataToSet });

			const prevJobData = await jobModal.findOne({ _id: jobId });

			const newJobData = prevJobData;

			// console.log(prevJobData, "\n\nIam the new job Data\n");

			if (prevJobData.applied == undefined) {
				// console.log("Over here\n");
				newJobData.applied.push(candidate_id);
				// console.log(newJobData, "\nNew job data\n");
			} else {
				// console.log("Over here 2\n");
				newJobData.applied.push(candidate_id);
			}

			await jobModal.findOneAndUpdate(
				{ _id: jobId },
				{ $set: newJobData },
				{ upsert: true }
			);

			res.send({ success: true, message: "Applied for job" });
		}
	} catch (err) {
		res.send({ success: false, message: err.message });
	}
});

// Get all applied jobs for a user
router.post("/jobs/appliedjobs", async (req, res) => {
	console.log("Inside the appliedjobs route\n");

	try {
		const resp = await User3.findOne({ _id: req.body.candidate_id });

		const appliedJobs = resp.jobStatistics.applied;

		console.log(appliedJobs, "\nIam the applied jobs\n");

		res.send({ success: true, message: appliedJobs });
	} catch (err) {
		console.log("Error in jobs/appliedjobs\n");
		res.send({ success: false, message: err.message });
	}
});

// Check if user has already applied for a job
router.post("/jobs/checkalreadyapplied", async (req, res) => {
	console.log("Inside the jobs/checkalreadyapplied route\n");

	try {
		const { candidate_id, jobId } = req.body;

		var resp = await User3.find({ _id: candidate_id });

		console.log(resp, "\n\n");

		if (resp != [] && resp.length > 0) {
			resp = resp[0];

			var check = false;

			for (let i = 0; i < resp.jobStatistics.applied.length; i++) {
				if (resp.jobStatistics.applied[i] == jobId) {
					check = true;
				}
			}

			if (check === true) {
				res.send({ success: true, message: "Already Applied for the job" });
			} else {
				res.send({ success: false, message: "Not Applied till now" });
			}
		} else {
			res.send({ success: false, message: "No such user with that email id" });
		}
	} catch (err) {
		console.log(err, "\nIam err in jobs/checkalreadyapplied");
		res.send({ success: false, message: "Error in checking" });
	}
});

// Get all shortlisted jobs for a user
router.post("/jobs/shortlistedjobs", async (req, res) => {
	console.log("Inside the appliedjobs route\n");

	try {
		const resp = await User3.findOne({ _id: req.body.candidate_id });

		const shortlistedJobs = resp.jobStatistics.shortlisted;

		res.send({ success: true, message: shortlistedJobs });
	} catch (err) {
		console.log("Error in jobs/appliedjobs\n");
		res.send({ success: false, message: err.message });
	}
});

// Get all shortlisted jobs for a user
router.post("/jobs/rejectedjobs", async (req, res) => {
	console.log("Inside the rejectedjobs route\n");

	try {
		const resp = await User3.findOne({ _id: req.body.candidate_id });

		const rejectedJob = resp.jobStatistics.rejected;

		res.send({ success: true, message: rejectedJob });
	} catch (err) {
		console.log("Error in jobs/appliedjobs\n");
		res.send({ success: false, message: err.message });
	}
});

// Get all hired shortlisted jobs for a user
router.post("/jobs/hiredjobs", async (req, res) => {
	console.log("Inside the hired route\n");

	try {
		const resp = await User3.findOne({ _id: req.body.candidate_id });

		const hired = resp.jobStatistics.hired;

		res.send({ success: true, message: hired });
	} catch (err) {
		console.log("Error in jobs/appliedjobs\n");
		res.send({ success: false, message: err.message });
	}
});

router.post("/jobs/filter", async (req, res) => {
	console.log("Inside /jobs/filter");

	try {
		var { category, city, jobTitle } = req.body;

		var query = {};

		// category.toLowerCase();
		// city.toLowerCase();
		// jobTitle.toLowerCase();

		// Backend Developer

		// if (jobTitle != undefined && jobTitle != "") {
		// 	jobTitle = `/${jobTitle}/`;
		// }

		if (category == "" && city == "") {
			query = { jobTitle: new RegExp(jobTitle, "i") };
		} else if (jobTitle == "" && category == "") {
			query = { city: city };
		} else if (jobTitle == "" && city == "") {
			query = { jobCategory: category };
		} else if (category == "") {
			query = {
				// jobTitle: { $regex: jobTitle, $options: "i" },
				jobTitle: new RegExp(jobTitle, "i"),
				city: city,
			};
		} else if (city == "") {
			query = {
				jobTitle: new RegExp(jobTitle, "i"),
				jobCategory: category,
			};
		} else if (jobTitle == "") {
			query = {
				city: city,
				jobCategory: category,
			};
		} else {
			query = {
				city: city,
				category: category,
				jobTitle: new RegExp(jobTitle, "i"),
			};
		}

		var resp = await jobModal.find(query);

		// console.log("\n\n", resp);

		res.send({ success: true, message: resp });
	} catch (err) {
		console.log("Error in jobs/filter");
		res.send({ success: false, message: err.message });
	}
});

module.exports = router;
