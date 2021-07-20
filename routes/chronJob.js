const axios = require("axios");
const router = require("express").Router();
const cron = require("node-cron");
const mongoose = require("mongoose");
const moment = require("node-moment");
const fetch = require("node-fetch");

const jobDetails = require("../models/cronjobData");
const User3 = require("../models/userModalC3");
const User = require("../models/userModel");
const ClientJobModel = require("../models/ClientJobModel");

const clientFxn = require("../models/jobDb").clientFxn;
const partnerFxn = require("../models/jobDb").partnerFxn;
const momatchUrl = "https://candidate.momatch.de/matches";
const matchMakingMail = require("./matchmakingMail");

const db = mongoose.connection;

require("dotenv").config();
const env = process.env;
const localurl = env.localurl;
const produrl = env.produrl;

var isValid = async () => {
	// check with the existing array that if jobs are changed or not if they are changed return true else return false;

	let prevCnt = await jobDetails.find().count();
	let newCnt = await ClientJobModel.find().count();

	console.log(prevCnt, "   ", newCnt, "\n\n Iam the count\n");

	return prevCnt !== newCnt;
};

router.post("/jobs/crondataupdate", async (req, res, next) => {
	// _id: "2f419a1901de1dd2e15f7ad213bf0bc05879ea33c04dbdcc4669c5a386e6f4cf",

	var allUsers = await User.find({}); // check for the active field activeJobSeeking --> true

	allUsers = allUsers; // change this and make this for all the users

	console.log(allUsers, "\nIam users\n");

	try {
		if (allUsers != null && allUsers.length > 0) {
			await allUsers.forEach(async ele => {
				try {
					var data = ele,
						prevId = ele._id;

					console.log(ele._id, "\nIam id in route\n\n");

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
					candidate.relocationWillingnessFlag =
						data["relocationWillingnessFlag"];
					candidate.careerLevel = data["careerLevel"];
					candidate.skills = data["skills"];
					candidate.languages = data["languages"];
					momatchData.candidate = candidate;

					const resp = await axios.post(momatchUrl, momatchData, {
						headers: { "Content-Type": "application/json" },
					});

					var momatchResult = resp.data;

					console.log(momatchResult, "\nIam the mo match data\n\n");

					var clientData = await clientFxn(momatchResult.client);
					var partnerData = await partnerFxn(momatchResult.partner);
					// console.log(partnerData);

					jobStatisticsForC3.jobStatistics.partner = partnerData;
					jobStatisticsForC3.jobStatistics.client = clientData;

					jobStatisticsForC3.jobStatistics.combined_applied_preferred =
						jobStatisticsForC3.jobStatistics.combined_applied === undefined
							? []
							: jobStatisticsForC3.jobStatistics.combined_applied;

					console.log(jobStatisticsForC3, "\n\n Iam job Statistics \n\n");

					if (
						jobStatisticsForC3.jobStatistics.applied &&
						jobStatisticsForC3.jobStatistics.applied.length > 0
					) {
						for (
							let i = 0;
							i < jobStatisticsForC3.jobStatistics.applied.length;
							i++
						)
							jobStatisticsForC3.jobStatistics.combined_applied_preferred.push(
								jobStatisticsForC3.jobStatistics.applied[i]
							);
					}

					if (
						jobStatisticsForC3.jobStatistics.preferred &&
						jobStatisticsForC3.jobStatistics.preferred.length > 0
					) {
						for (
							let i = 0;
							i < jobStatisticsForC3.jobStatistics.preferred.length;
							i++
						)
							jobStatisticsForC3.jobStatistics.combined_applied_preferred.push(
								jobStatisticsForC3.jobStatistics.preferred[i]
							);
					}

					var c3Data = {
						_id: prevId,
						jobStatistics: jobStatisticsForC3.jobStatistics,
					};

					var updResp = await User3.findOneAndUpdate(
						{ _id: prevId },
						{ $set: c3Data }
					);
				} catch (err) {
					console.log(
						err.message,
						"\nError inside the cron job in jobs cron\n\n"
					);
				}
			});

			var prevJobs = [];

			prevJobs = await jobDetails.find({});

			var allNewJobs = await ClientJobModel.find({
				_id: { $nin: prevJobs },
			});

			console.log(allNewJobs.length, "\n\nIam the length of allnewJobs\n");

			await allNewJobs.forEach(async ele => {
				// console.log(ele, "\n\n new job\n\n");
				await db.collection("cronjobs").save(ele);
			});

			res.send({ success: true, message: "Success" });
		}
	} catch (err) {
		console.log(err, "\n\n Iam the error in cron");
		return { success: false, message: "Error" };
	}
});

router.post("/jobs/cronjob", async (req, res, next) => {
	// running in every 2 days
	cron.schedule("0 0 0 */3 * *", async (req, res, next) => {
		try {
			var check = await isValid();

			if (true) {
				// if we have a new job we need to send notification to the user

				try {
					try {
						const resp = await fetch(produrl + "/jobs/crondataupdate", {
							method: "POST",
							body: { data: "tempData" },
						});
					} catch (err) {
						console.log(err, "\n\nError in axios in jobs cron\n\n");
					}
				} catch (err) {
					res.send({
						success: false,
						message: "Cron Job stopped due to error with axios",
					});
				}
			}
		} catch (err) {
			console.log("Error in main cron\n");
			res.send({
				success: false,
				message: "Cron job stopped due to some error",
			});
		}
	});
});

router.post("/jobs/stopmatchmaking", async (req, res) => {
	// find all the users whose active job seeking is true and they are inactive for 3 months
	// finding date which is older by 3months from today in mongodb

	try {
		var threeMonthsAgo = moment().subtract(3, "months");
		threeMonthsAgo = threeMonthsAgo.format();

		console.log(threeMonthsAgo, "Iam inside jobs/stopmatchmaking\n");

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

		const resp = await db.collection("Candidates_C1").find(query).toArray();

		if (resp != null && resp != []) {
			resp.forEach(async ele => {
				const updResp = await db
					.collection("Candidates_C1")
					.findOneAndUpdate(
						{ _id: ele._id },
						{ $set: { activeJobSeeking: false } }
					);

				await matchMakingMail(ele.email, ele.firstName + " " + ele.lastName);
			});
		}
	} catch (err) {
		console.log(err, "\nIam err in deactivate\n");
		res.send("Error in cron");
	}
});

router.post("/jobs/deactivate", async (req, res, next) => {
	// if anyone on the platform reg before 90 days	then switch activeJobSeeking --> false and mail them if still interested then click and activate again

	cron.schedule("*/10 0 0 * * *", async (req, res, next) => {
		console.log("Hi from 2 cron\n");
		const resp = await axios.post(produrl + "/jobs/stopmatchmaking", {});

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

/**
 * Paste one or more documents here
 */
// {
//     "countryPreferences": ["Germany"],
//     "cityPreferences": ["Berlin", "Munich", "Frankfurt am Main", "Stuttgart"],
//     "desiredPositions": ["Head of IT and Infrastructure (m/w/d) - BM21_1309"],
//     "languages": [{
//         "language": "Dutch",
//         "level": "Native"
//     }, {
//         "language": "English",
//         "level": "C1"
//     }, {
//         "language": "French",
//         "level": "B2"
//     }, {
//         "language": "German",
//         "level": "B1"
//     }, {
//         "language": "Spanish; Castilian",
//         "level": "B2"
//     }],
//     "skills": ["Veeam", "Microsoft Exchange", "Microsoft Servers", "Microsoft Windows Azure", "VMware", "MDM", "Microsoft Certified Professional", "Active Directory", "Microsoft technologies", "Dell", "HP", "VMware ESXi", "Infrastructure architecture", "Cloud", "IT project management"],
//     "industries": ["Information Technology and Services", "Airlines/Aviation", "Government Relations", "Staffing and Recruiting"],
//     "workExperience": [{
//         "Category": "IT Operations",
//         "Role": "System Administrator",
//         "Experience": 4
//     }],
//     "firstName": "Olivier",
//     "lastName": "Van Damme",
//     "email": "olivier.van.damme@gmail.com",
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
//         "LinkedIn": "https://www.linkedin.com/in/oliviervandamme/",
//         "Github": "",
//         "Xing": "https://www.xing.com/profile/Olivier_VanDamme/cv",
//         "Dribbble": "",
//         "Behance": "",
//         "Other": ""
//     },
//     "country": "Belgium",
//     "city": "Hoboken",
//     "visaType": "EU Citizen",
//     "earliestJoiningDate": "13-05-2013",
//     "currentlyEmployedFlag": true,
//     "drivingPermitFlag": true,
//     "contactNumber": "+32473959620",
//     "noticePeriod": 3,
//     "careerLevel": "Senior",
//     "createdAt": {
//         "$date": "2021-06-14T20:16:40.951Z"
//     },
//     "cv": {
//         "filename": "olivier_van_damme_2db9b868b39cf6c9.pdf",
//         "english": true,
//         "german": false
//     },
//     "profileSecurity": {
//         "ipHistory": [],
//         "lastProfileUpdateAt": "2021-06-14T20:16:40.951Z",
//         "lastDataRequestAt": null,
//         "emailVerificationFlag": false,
//         "resetPasswordFlag": false,
//         "password": "$2a$10$x0JIbRbaeVKoeyLyUjdQ5.PnTQgzKivnca/znxoVmX55FebFreSiq"
//     },
//     "helperInformation": {
//         "source": "Node-App",
//         "profileCompleteFlag": true,
//         "formattedBy": "back-end",
//         "dataVerificationFlag": true
//     },
//     "__v": 0
// }

/**
 * Paste one or more documents here
 */

// {
//     "Industries": ["Insurance"],
//     "Skills": ["microsoft windows azure"],
//     "shortlisted": [],
//     "hired": [],
//     "rejected": [],
//     "recommended": [],
//     "company": {
//         "$oid": "60c1cc183be7891b11e934ed"
//     },
//     "jobTitle": "IT systems administrator AE21 (m/w/d)",
//     "jobUrl": "https://moyyn.com",
//     "requirements": "Ihr Profil\n– (Fach)Hochschulabschluss, vorzugsweise im Bereich Informatik oder eine Ausbildung zum Fachinformatiker; alternativ Quereinsteiger mit entsprechender Berufserfahrung\n– Je nach Vorbildung 2 bis 5 Jahre an Berufserfahrung im IT-Umfeld\nFundierte und praktische Erfahrung mit Oracle 11/12 in einem Unternehmen, idealerweise auch im Cluster (RAC)\n– Gute Kenntnisse der Betriebssysteme Linux (Schwerpunkt) und Windows im Zusammenhang mit Oracle sowie Programmierkenntnisse in SQL, PL/SQL und Unix-Shellscripts\n– Erste Projekterfahrungen mit einer ausgeprägten selbstständigen und eigenverantwortlichen Arbeitsweise\n– Sehr gute mündliche und schriftliche Kommunikationsfähigkeiten, insbesondere in Deutsch (B1-C2) und Englisch\n– Die Bereitschaft, auch unsere interne IT-Hotline zu unterstützen\nAgile sowie proaktive Herangehensweise und Hands-On Mentalität\nBewerbungen von Menschen mit Behinderung werden bei gleicher Qualifikation bevorzugt berücksichtigt.\n\nEs erwartet Sie:\n\n– Die Möglichkeit, sowohl im Büro in München als auch ortsunabhängig in Deutschland zu arbeiten\n– Eine leistungsgerechte Vergütung verbunden mit flexiblen Arbeitszeiten und Smart Working sowie 30 Tagen Urlaub\n– Ein hohes Maß an Eigenverantwortung und Gestaltungsfreiheit, viel Raum zur persönlichen Weiterentwicklung\n– Ein spannendes und dynamisches Umfeld mit kurzen Entscheidungswegen.\n– Ein internationales Team, das gemeinsam unseren erfolgreichen Wachstumskurs vorantreibt mit dem Ziel, den Status als zuverlässigstes Care Unternehmen halten und ausbauen zu können\n– Internationale Entwicklungsmöglichkeiten\n– Attraktive Altersvorsorgebausteine (Vermögenswirksame Leistungen sowie eine Direktgeldumwandlung mit Arbeitgeberzuschuss)\n\nGehalt: 60000€ – 80000€",
//     "description": "Unser Kunde ist eine in München ansässige Versicherungsgruppe, die innovative Versicherungs- und Serviceprodukte in den Bereichen Reisen, Mobilität, Home & Connected Living, Gesundheit und Seniorenbetreuung anbietet.\n\nIhre Aufgabe\nIn dieser vielfältigen Aufgabe als IT-Systemadministrator (m/w/d) bzw. Fachinformatiker (w/m/d) sind Sie für die Betreuung unserer Oracle-Datenbanken sowie der zugehörigen Linux-Server zuständig. Mit Beginn der zweiten Jahreshälfte startet ein spannendes Projekt. Sie werden dabei in den nächsten 12 Monaten Ihre IT-Kollegen/innen bei der Migration der Systeme in die Cloud (Microsoft Azure) unterstützen. Dabei sind Sie Teil eines motivierten, internationalen und sehr kollegialen Teams von IT-Profis.\n\nIhre Hauptaufgaben sind:\n\n– Administration, Konfiguration und Optimierung unserer Oracle-Datenbanken in einem Cluster (RAC) sowie der zugehörigen Standby- und Testsysteme\n– Sicherstellung der Verfügbarkeit und Wiederherstellbarkeit dieser Datenbanken\n– Abstimmung von Schnittstellen mit den Fachabteilungen und mit Großkunden\n– Verarbeitung und Optimierung von Datenloads\n– Planung und Durchführung von Upgrades\n– Administration der eingesetzten Systeme auf Basis von Linux\n– Mitwirkung bei der Erstellung von Konzepten und Dokumentationen für unsere IT-Systeme\n– Mitarbeit bei lokalen Projekten und internationalen Projekten\n– Aktive Gestaltung des Themas Informationssicherheit im eigenen Bereich",
//     "careerLevel": "Senior",
//     "Date": "12-07-2021",
//     "Languages": [{
//         "_id": {
//             "$oid": "60ebffb7fff3180b4fa4f842"
//         },
//         "language": "German",
//         "level": "B2"
//     }],
//     "workExperience": [{
//         "_id": {
//             "$oid": "60ebffb7fff3180b4fa4f843"
//         },
//         "Category": "IT Operations",
//         "Role": "System Administrator",
//         "Experience": 2
//     }],
//     "city": "Munich",
//     "country": "Germany",
//     "state": "Bavaria",
//     "postcode": "80331",
//     "currency": "Euro",
//     "from": 60000,
//     "to": 79998,
//     "otherCountries": false,
//     "timestamp": {
//         "$date": "2021-07-19T13:46:18.020Z"
//     },
//     "ifDeleted": false,
//     "jobCodeUnique": 2,
//     "jobCode": "47_CL_0_45",
//     "__v": 0
// }

// {
//             "job_id": {
//                 "$oid": "60c1cd7f3be7891b11e934ee"
//             },
//             "jobcode": "0_CL_0_1",
//             "description": "Für unseren Partner, suchen wir Senior Backend Engineer/ System Architect\n\nWas sind Deine Aufgaben?\n\n– Du konzipierst, diskutierst und präsentierst die Strukturen unseres Backends basierend auf den Anforderungen unserer Geschäftslogik. Dabei stellst du sicher, dass unser Backend stets flexibel anpassbar, skalierbar und zukunftsfest bleibt.\n– Du kennst Dich aus mit Node.js, MongoDB, Vue.js, Firebase und Flutter.\n– Du identifizierst Verbesserungspotenziale in Struktur und Code unseres Backends und treibst Diskussionen und Entscheidungen zu deren Realisierung voran.\n– Du gestaltest mit, welche Technologien und Dienste wir einsetzen und kommunizierst technische Sachverhalte sowohl an interne und externe Stakeholder.\n– Du coachst andere Entwickler bei der Realisierung unseres Backends. Du entwickelst selbst mit und implementierst backendseitige Funktionalitäten.\n– Du prüfst, bewertest und gestaltest Arbeitsprozesse im Entwicklerteam, um die Einhaltung von Best Practices und modernen Standards sicherzustellen.\n\nWas erwartet Dich?\n\n– Ein State-of-the-Art Tech-Stack\n– Impact. Als Architekt und Senior Engineer hast Du federführend Einfluss auf die Konzeption und Umsetzung unseres Backends. Du wirkst nicht nur maßgeblich bei dessen Strukturierung mit, sondern auch bei der Zusammensetzung unseres Technologie Stacks und der eingesetzten Dienste.\n– Entfaltung. Kontinuierliches Lernen ist die Basis für persönliche Weiterentwicklung. Wir räumen Arbeitszeit für die freie Beschäftigung mit Wunschthemen ein. Wir zahlen Kurse und Fortbildungen.\n– Purpose. Wir machen Unternehmen digitaler und sicherer. Wir bieten die Infrastruktur für moderne Organisationen und Arbeitsformen.\n– Team. Du arbeitest mit einer internationalen Truppe von Entwicklern, Designern, Produktmanagern und Testern, die zusammen gewinnen möchte.\n\n",
//             "title": "Senior Backend Engineer/ System Architect/ CTO – SW20_1",
//             "location": {
//                 "country": "Germany",
//                 "city": "Hamburg"
//             }
//         }
