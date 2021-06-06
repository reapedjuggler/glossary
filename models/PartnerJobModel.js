const mongoose = require('mongoose');
var url = "mongodb+srv://smurfette:rKvfAgK4AElQMw5C@cluster0.egtjb.mongodb.net/PROD?retryWrites=true&w=majority";

mongoose.connect(url, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

var PartnerJobSchema = mongoose.Schema({
    jobTitle:{
        type:String
    },
    description:{
        type:String
    },
    city:{
        type:String
    },
    country:{
        type:String
    },
    jobCode:{
        type:String
    }
})

var PartnerJobs  = module.exports = mongoose.model('PROD2', PartnerJobSchema, 'partner_jobs');
