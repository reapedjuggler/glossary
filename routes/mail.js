const AWS = require("aws-sdk");

AWS.config.update({
	accessKeyId: "AKIAU6KAQMFTJDMR5U4R",
	secretAccessKey: "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",
	region: "eu-central-1",
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

module.exports = mail = (to, pass, address) => {
	const params = {
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Body: {
				Html: {
					Charset: "UTF-8",
					Data:
						"Hello from Moyyn!<br>You have requested to reset the password in Moyyn.<br><br>Email address: " +
						address +
						"<br>" +
						"Password: " +
						pass +
						"<br><br>Please use this temporary one time password to login now and update your new password.<br>Best regards,<br>Moyyn",
				},
				/* replace Html attribute with the following if you want to send plain text emails. 
                Text: {
                    Charset: "UTF-8",
                    Data: message
                }
             */
			},
			Subject: {
				Charset: "UTF-8",
				Data: "Moyyn Password Reset",
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
