/**
 * modules dependencies.
 */
const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const logger = require('./loggerLib.js');
const events = require('events');
const eventEmitter = new events.EventEmitter();
const userController = require("./../controllers/userController");

const tokenLib = require("./tokenLib.js");
const check = require("./checkLib.js");
const response = require('./responseLib')

const MeetingModel = mongoose.model('Meeting')

let setServer = (server) => {

    let allOnlineUsers = []

    let io = socketio.listen(server);

    //let myIo = io.of('')

    io.on('connection',(socket) => {

        console.log("on connection--emitting verify user");

       // socket.emit("verifyUser", {status: 200, message: 'Verified Successfully'});

        // code to verify the user and make him online

        socket.on('set-user',(authToken) => {

            console.log("set-user called", authToken)
            tokenLib.verifyClaimWithoutSecret(authToken,(err,user)=>{
                if(err){
                    socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' })
                }
                else{

                    console.log("user is verified..setting details", user);
                    let currentUser = user.data;
                    // setting socket user id 
                    socket.userId = currentUser.userId
                    let fullName = `${currentUser.firstName} ${currentUser.lastName}`
                    console.log(`${fullName} is online`);
                    socket.emit(currentUser.userId,"You are online")

                    let userObj = {userId:currentUser.userId,fullName:fullName}
                    allOnlineUsers.push(userObj)
                    console.log(allOnlineUsers)


                     // setting room name
                     socket.room = 'edChat'
                     // joining chat-group room.
                     socket.join(socket.room)
                     socket.to(socket.room).broadcast.emit('online-user-list',allOnlineUsers);

                }


            })
          
        }) // end of listening set-user event


        socket.on('disconnect', () => {
            // disconnect the user from socket
            // remove the user from online list
            // unsubscribe the user from his own channel

            console.log("user is disconnected");
            // console.log(socket.connectorName);
            console.log(socket.userId);
            var removeIndex = allOnlineUsers.map(function(user) { return user.userId; }).indexOf(socket.userId);
            allOnlineUsers.splice(removeIndex,1)
            console.log(allOnlineUsers)


        }) // end of on disconnect


        socket.on('save-meeting', (data) => {
            console.log('save meeting inside', data);
                data['isNew']=true;
           setTimeout(() => {
               eventEmitter.emit('save-event', data);
           }, 2000);
          io.emit(data.recieverUserId, data)
           io.emit(data.senderUserId, data)
        }) // End Of save-meeting

        socket.on('edit-meeting', (data) => {
            console.log('save meeting inside', data);
            data['isNew']=false;
           setTimeout(() => {
               eventEmitter.emit('edit-event', data);
           }, 2000);
          io.emit(data.recieverUserId, data)
           io.emit(data.senderUserId, data)
        }) // end of edit-meeting


    });

}

eventEmitter.on('save-event', (req, res) => {

    let newMeeting = new MeetingModel ({
        recieverUserId: req.recieverUserId,
        senderUserId: req.senderUserId,
        title: req.title,
        startDate: req.startDate,
        endDate: req.endDate,
        draggable: req.draggable,
        itemId: shortid.generate(),
        when: req.when,
        where: req.where,
        purpose: req.purpose,
        eventCreatedBy: req.userName

    })

    console.log('new',newMeeting);

    newMeeting.save((err, result) => {
        if (err) {
            logger.error(err.message, 'userController: createUser', 10)
            let apiResponse = response.generate(true, 'Failed to create New Meeting', 500, null)
            console.log(apiResponse);
        } else if(check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Result Found', 404, null)
            console.log(apiResponse);
        } else {
            let apiResponse = response.generate(false, 'Event Successfully Saved', 200, null)
           console.log(apiResponse);
        }
    })
})

eventEmitter.on('edit-event', (req,res) => {
    let options = req
    console.log('options', options)
    MeetingModel.update({'itemId':req.itemId}, options)
    .exec((err, result) => {
        if(err) {
            let apiResponse = response.generate(true, 'Failed to delete Event', 500, null)
            // res.send(apiResponse)
        } else if(check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            // res.send(apiResponse)
        } else {
            console.log('result', result);
            let apiResponse = response.generate(false, 'Event details edited', 200, result)
            // res.send(apiResponse)
        }
    })
})




module.exports = {
    setServer: setServer
}
