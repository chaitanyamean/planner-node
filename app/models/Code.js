const mongoose = require('mongoose')
const Schema = mongoose.Schema
const time = require('../libs/timeLib')


const Code = new Schema ({
    userId: {
        type: String
      },
      email: {
        type: String
      },
      code: {
        type: String
      },
})

module.exports = mongoose.model('Code', Code)