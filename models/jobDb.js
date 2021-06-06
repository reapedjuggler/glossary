var MongoClient = require('mongodb').MongoClient;
var ClientJobs = require('./ClientJobModel');
var PartnerJobs = require('./PartnerJobModel');
var clientJobs = ["1_CL_1_1"];
var partnerJobs = ["BM21_905","BM21_990","BM21_991","BM21_992","BM21_993"];

var clientFxn = async function getClientJobs(clientJobs){

    var clientJobsresult = [];

    await ClientJobs.find().then(async (jobs) =>{

    jobs.forEach((job) => {
            // console.log(job.jobCode);
            if (clientJobs.includes(job.jobCode)) {
                var tempAr = {
                    job_id: job._id,
                    jobcode: job.jobCode,
                    description: job.description,
                    title: job.jobTitle,
                    location: {
                        country: job.country,
                        city: job.city
                    }
                };
                  clientJobsresult.push(tempAr);
            }
        });
})

    // console.log(clientJobsresult);
    return clientJobsresult;
};


var partnerFxn = async function getPartnerJobs(partnerJobs){

    var partnerJobsresult = [];

    await PartnerJobs.find().then(async (jobs) =>{

    jobs.forEach((job) => {
            // console.log(job);
            if (partnerJobs.includes(job.jobCode)) {
                var tempAr = {
                    description: job.description,
                    title: job.jobTitle,
                    location: {
                        country: job.country,
                        city: job.city
                    }
                };
                  partnerJobsresult.push(tempAr);
            }
        });
})

    // console.log(partnerJobsresult);
    return partnerJobsresult;
};



// getPartnerJobs(partnerJobs);
// getClientJobs(clientJobs);
module.exports  = {clientFxn, partnerFxn}