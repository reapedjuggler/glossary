const axios = require('axios');
var tempUrl = 'https://candidate.momatch.de/matches';
var tempBody = {
    "candidate":{
        "city":"Berlin",
        "relocationWillingnessFlag":true,
        "careerLevel":"Senior",
        "skills":[
            "Java",
            "JavaScript",
            "C++",
            "Python"
        ],
        "languages":[
            {
                "language":"German",
                "level":"Native"
            },
            {
                "language":"Russian",
                "level":"Native"
            },
            {
                "language":"English",
                "level":"Native"
            }
        ]
    }
};



module.exports = momatch = async (body)=>{
    axios({
        method: 'post',
        url: tempUrl,
        data: body,
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(function (response) {
        console.log(response.data);
    }).catch(function (error) {
        console.log(error);
    }); 
}

// momatch(tempBody);
