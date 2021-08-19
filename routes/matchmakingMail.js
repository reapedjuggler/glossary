const AWS = require("aws-sdk");

AWS.config.update({
	accessKeyId: "AKIAU6KAQMFTJDMR5U4R",
	secretAccessKey: "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",
	region: "eu-central-1",
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

module.exports = mailForDelete = (to, name) => {
	const params = {
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Body: {
				Html: {
					Charset: "UTF-8",
					Data: `
					Dear ${name}, <br>
					Greetings from Moyyn!<br>
					We wanted to let you know that your job matching is turned OFF as there was no activity on your profile for sometime. We assume that you have got a new job already! If that's the case, great to hear that and congrats.
					IF YOU ARE STILL LOOKING FOR A NEW JOB,
					In Settings, please update the status to 'START MATCHING'.
					IF YOU ARE NO LONGER LOOKING FOR A NEW JOB, but still wanted to stay in the talent pool, please do not change anything. But, you can turn ON matching at any point of time in the future.
					<br>Good luck,<br>
					Moyyn Talent Team
					`,
				},
			},
			Subject: {
				Charset: "UTF-8",
				Data: "Delete Profile",
			},
		},
		ReturnPath: "talents@moyyn.com",
		Source: "talents@moyyn.com",
	};

	ses.sendEmail(params, (err, data) => {
		if (err) {
			return console.log(err, err.stack);
		} else {
			console.log("Email sent.", data);
		}
	});
};

// mail("tomarvibhav55@gmail.com", "pass")
// module.exports = {sendEmail};

// Dear [Canddiate first name],
// Greetings from Moyyn!
// We wanted to let you know that your job matching is turned OFF as there was no activity on your profile for sometime. We assume that you have got a new job already! If that's the case, great to hear that and congrats.
// IF YOU ARE STILL LOOKING FOR A NEW JOB,
// In Settings, please update the status to 'START MATCHING'.
// IF YOU ARE NO LONGER LOOKING FOR A NEW JOB, but still wanted to stay in the talent pool, please do not change anything. But, you can turn ON matching at any point of time in the future.
// Good luck,
// Moyyn Talent Team
