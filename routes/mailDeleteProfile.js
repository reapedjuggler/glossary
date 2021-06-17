const AWS = require("aws-sdk");

AWS.config.update({
	accessKeyId: "AKIAU6KAQMFTJDMR5U4R",
	secretAccessKey: "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",
	region: "eu-central-1",
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

module.exports = mailForDelete = (to, filenameEnglish, filenameGerman) => {
	const params = {
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Body: {
				Html: {
					Charset: "UTF-8",
					Data:
						"Hallo," +
						"I, as a candidate of Moyyn, would like to delete my profile from the platform" +
						"<br>Below are my details<br><br>" +
						"filename - EnglishCV: " + filenameEnglish + "<br>" +
						"filename - GermanCV: " + filenameGerman,
						
				},
			},
			Subject: {
				Charset: "UTF-8",
				Data: "Delete Profile"
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

// mail("rishabhbhandari6@gmail.com", "pass")
// module.exports = {sendEmail};
