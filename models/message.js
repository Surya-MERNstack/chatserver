const mongoose = require("mongoose");

const messageSchema = mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
  },  
  text : String,
  file : String 
}, {timestamps : true});


module.exports = mongoose.model('Message', messageSchema)

  