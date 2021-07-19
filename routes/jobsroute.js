const express = require("express");
const router = express.Router();

const jobModal = require("../models/ClientJobModel");
const User1 = require("../models/userModel");
const User2 = require("../models/userModalC2");
const User3 = require("../models/userModalC3");

// Get all the jobs
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

// Apply for a client job
router.post("/jobs/applyforjob", async (req, res) => {
	console.log("Inside the applyforjob route\n");

	try {
		const { candidate_id, jobId } = req.body.jobId;

		const prevResp = await User3.findOne({ _id: candidate_id });

		const dataToSet = prevResp;

		dataToSet.applied.push(jobId);

		var temp = [];

		temp = temp.concat(dataToSet.applied);
		temp = temp.concat(dataToSet.preffered);

		dataToSet.combined_applied_preffered.push(temp);

		await User3.findOneAndUpdate({ _id: candidate_id }, { $set: dataToSet });

		res.send({ success: true, message: resp.client });
	} catch (err) {
		res.send({ success: false, message: err.message });
	}
});

// Get all applied jobs for a user
router.post("/jobs/appliedjobs", async (req, res) => {
	console.log("Inside the appliedjobs route\n");

	try {
		const resp = await User3.findOne({ _id: req.body.candidate_id });

		const appliedJobs = resp.applied;

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
		const candidate_id = req.body.candidate_id;

		const resp = await User1.find({ _id: candidate_id });
	} catch (err) {
		console.log(err, "\nIam err in jobs/checkalreadyapplied");
		res.send({ success: false, message: false });
	}
});

module.exports = router;
