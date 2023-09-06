const mongoose = require('mongoose');


const UserSchema = mongoose.Schema({
     username : {
         type : String,
         unique : true 
     }, 
     password : {
        type : String
     }
}, {timestamps : true})


module.exports = mongoose.model('ChatData', UserSchema)