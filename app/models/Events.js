const mongoose = require('mongoose')
const Schema = mongoose.Schema
const time = require('../libs/timeLib')


const Meeting = new Schema ({
    recieverUserId: {
        type: String
      },
      senderUserId: {
        type: String
      },
      eventCreatedBy: {
        type: String
      },
      title: {
        type: String
      },
      startDate: {
        type: Date
      },
      endDate: {
        type: Date,
        default: time.now()
      },
      draggable: {
          type: Boolean
      },
      itemId: {
        type: String
      },
      when: {
        type: String
      },
      where: {
        type: String
      },
      purpose: {
        type: String
      }
})

module.exports = mongoose.model('Meeting', Meeting)
