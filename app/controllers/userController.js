const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const validateInput = require('../libs/paramsValidationLib')
const check = require('../libs/checkLib')
const passwordlib = require('./../libs/generatePasswordLib')
const token = require('./../libs/tokenLib')
const AuthModal = require('./../models/Auth')
const Events = require('./../models/Events')
var nodemailer = require('nodemailer');

/* Models */
const UserModel = mongoose.model('User')
const MeetingModel = mongoose.model('Meeting')
const CodeModel = mongoose.model('Code');


// start user signup function 

let signUpFunction = (req, res) => {

    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (req.body.email) {
                if (!validateInput.Email(req.body.email)) {
                    let apiResponse = response.generate(true, 'Email entered is incorrect format', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(req.body.password)) {
                    let apiResponse = response.generate(true, 'Email entered is incorrect format', 400, null)
                    reject(apiResponse)
                } else {
                    resolve(req);
                }
            } else {
                logger.error('Field Missing During User Creation', 'userController: createUser()', 5)
                let apiResponse = response.generate(true, 'One or More Parameter(s) is missing', 400, null)
                reject(apiResponse)
            }
        })
    }

    let createUser = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ email: req.body.email })
                .exec((err, retriveDetails) => {
                    if (err) {
                        logger.error(err.message, 'userController: createUser', 10)
                        let apiResponse = response.generate(true, 'Failed to create new User', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(retriveDetails)) {
                        var userName;
                        if (req.body.isAdmin) {
                            userName = req.body.firstName + '-admin'  
                        } else {
                            userName = req.body.firstName 
                        }
                        let newUser = new UserModel({
                            userId: shortid.generate(),
                            firstName: req.body.firstName,
                            lastName: req.body.lastName || '',
                            email: req.body.email.toLowerCase(),
                            mobileNumber: req.body.mobileNumber,
                            password: passwordlib.hashpassword(req.body.password),
                            isAdmin: req.body.isAdmin,
                            userName: userName,
                            created: time.now()
                        })
                        newUser.save((err, newUser) => {
                            if (err) {
                                logger.error(err.message, 'userController: createUser', 10)
                                let apiResponse = response.generate(true, 'Failed to create new User', 500, null)
                                reject(apiResponse)
                            } else {
                                let newObj = newUser.toObject()
                                //console.log('newUser', newUser)
                                resolve(newObj)
                            }
                        })
                    } else {
                        logger.error('User Cannot Be Created.User Already Present', 'userController: createUser', 4)
                        let apiResponse = response.generate(true, 'User Already Present With this Email', 403, null)
                        reject(apiResponse)
                    }
                })
        })
    }

    validateUserInput(req, res)
        .then(createUser)
        .then((resolve, reject) => {
            delete resolve.password
            let apiResponse = response.generate(false, 'User created', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log(err);
            res.send(err);
        })
  

}// end user signup function 

// start of login function 
let loginFunction = (req, res) => {

    console.log('this is login')

        let findUser = () => {
            return new Promise((resolve, reject) => {
                if (req.body.email) {
                    UserModel.findOne({ email: req.body.email }, (err, userDetails) => {
                        if (err) {
                            console.log(err);
                            logger.error('unable to retrive user details', 'finduser()', 10)
                            let apiResponse = response.generate(true, 'unable to retrive user details', 500, null)
                            reject(apiResponse)
                        } else if (check.isEmpty(userDetails)) {
                            logger.error('No User Found', 'userController: findUser()', 7)
                            let apiResponse = response.generate(true, 'No User Details Found', 404, null)
                            reject(apiResponse)
                        } else {
                            logger.info('user found', 'finduser()', 10)
                            resolve(userDetails)
                        }
                    })
                } else {
                    let apiResponse = response.generate(true, 'Email parameter is missing', 400, null)
                    reject(apiResponse)
                }
            })
        }

        let validatePassword = (retriveUserDetails) => {

            return new Promise((resolve, reject) => {
               // console.log('entered password', req.body.password)
               // console.log('retriveUserDetails.password', retriveUserDetails.password)

                passwordlib.comparePassword(req.body.password, retriveUserDetails.password, (err, isMatch) => {
                    if (err) {
                        console.log(err);
                        logger.error('unable to retrive user details', 'validatePassword()', 10)
                        let apiResponse = response.generate(true, 'unable to retrive user details', 500, null)
                        reject(apiResponse)
                    } else if (isMatch) {
                        let detailsObject = retriveUserDetails.toObject()
                        delete detailsObject.password
                        delete detailsObject._id
                        delete detailsObject.__v
                        delete detailsObject.createdOn
                        delete detailsObject.modifiedOn
                        resolve(detailsObject)
                    } else {
                        console.log(err);
                        logger.error('Wrong password, Login failed', 'validatePassword()', 10)
                        let apiResponse = response.generate(true, 'Wrong password, Login failed', 400, null)
                        reject(apiResponse)
                    }
                })
            })
        }

        let generateToken = (userDetails) => {
            //console.log("generate token", userDetails);

            return new Promise((resolve, reject) => {
                token.generateToken(userDetails, (err, tokenDetails) => {
                    if (err) {
                        logger.error('unable to retrive token details', 'validatePassword()', 10)
                        let apiResponse = response.generate(true, 'unable to retrive token details', 500, null)
                        reject(apiResponse)
                    } else {
                        tokenDetails.userId = userDetails.userId
                        tokenDetails.userDetails = userDetails
                        resolve(tokenDetails)
                    }
                })
            })
        }

        let saveToken = (tokenDetails) => {
            return new Promise((resolve, reject) => {
                AuthModal.findOne({ userId: tokenDetails.userId }, (err, retriveTokenDetails) => {
                    if (err) {
                        logger.error('unable to retrive token user details', 'validatePassword()', 10)
                        let apiResponse = response.generate(true, 'unable to retrive token user details', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(retriveTokenDetails)) {
                        let newUserDetails = new AuthModal({
                            userId: tokenDetails.userDetails.userId,
                            authToken: tokenDetails.token,
                            tokenSecret: tokenDetails.tokenSecret,
                            tokenGenerationTime: time.now()
                        })
                        newUserDetails.save((err, newTokenDetails) => {
                            if (err) {
                                console.log(err)
                                logger.error(err.message, 'userController: saveToken', 10)
                                let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                                reject(apiResponse)
                            } else {
                                let responseBody = {
                                    authToken: newTokenDetails.authToken,
                                    userDetails: tokenDetails.userDetails
                                }
                                resolve(responseBody)
                            }
                        })
                    } else {
                       // console.log('RetriveTokenDetails************* \n', retriveTokenDetails)
                        //console.log('\n\n\n\n')
                        //console.log('RetriveTokenDetails************* \n', tokenDetails)

                        //console.log('existing one bro')
                        retriveTokenDetails.authToken = tokenDetails.token
                        retriveTokenDetails.tokenSecret = tokenDetails.tokenSecret
                        retriveTokenDetails.tokenGenerationTime = time.now()
                        retriveTokenDetails.save((err, newTokenDetails) => {
                            if (err) {
                                console.log(err)
                                logger.error(err.message, 'userController: saveToken', 10)
                                let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                                reject(apiResponse)
                            } else {
                                let responseBody = {
                                    authToken: newTokenDetails.authToken,
                                    userDetails: tokenDetails.userDetails
                                }
                                resolve(responseBody)
                            }
                        })

                    }
                })
            })
        }


        findUser(req, res)
            .then(validatePassword)
            .then(generateToken)
            .then(saveToken)
            .then((resolve) => {
                let apiResponse = response.generate(false, 'Login Successful', 200, resolve)
                res.status(200)
                res.send(apiResponse)

            })
            .catch((err) => {
               // console.log("errorhandler");
                console.log(err);
                res.status(err.status)
                res.send(err)
            })
    
}


// end of the login function 




let forgotPassword = (req,res) => {

    findUser = () => {
        return new Promise((resolve, reject) => {

            UserModel.find({email: req.body.email}).select(' -__v -_id').lean().exec((err, result) => {
                if(err) {
                    let apiResponse = response.generate(true, 'Failed to find users', 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'No User Found', 404, null)
                    reject(apiResponse)
                } else {
                    let apiResponse = response.generate(false, 'Email Fund', 200, result)
                    resolve(result)
                    //console.log('apiResponse',result[0].password);
                  //  console.log('Data.password',apiResponse.data.password);
        
                }
        })
    })

}


   let generateCode = (retriveDetails) => {

    return new Promise((resolve, reject) => {

        let codeDetails = new CodeModel({
            userId: retriveDetails[0].userId,
            email: retriveDetails[0].email,
            code: shortid.generate()
        })

        codeDetails.save((err, result) => {
            if (err) {
                logger.error(err.message, 'userController: createUser', 10)
                let apiResponse = response.generate(true, 'Failed to create new User', 500, null)
                reject(apiResponse)
            } else {
                let newObj = result.toObject()
               // console.log('NEWCODE', newObj)
                resolve(newObj)
            }
        })
    })       
   }

    findUser(req, res)
    .then(generateCode)
    .then((resolve) => {
        //console.log('REsolve', resolve);
       // let apiResponse = response.generate(false, 'Mail Sent Succesfully', 200, resolve)
        //res.status(200)
        //res.send(apiResponse)
        delete resolve._id;
        delete resolve.__v;

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'edwisormean@gmail.com',
              pass: 'meanstack@248'
            }
          });
     
          var mailOptions = {
            from: 'edwisormean@gmail.com',
            to: resolve.email,
            subject: 'Sending Email using Node.js',
            text: 'Your code is' + resolve.code,
            html: '<h1>Your Code is</h1>' + resolve.code
          };
          
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
              let apiResponse = response.generate(true, 'Error', 404, error)
                    res.status(404)
                    res.send(apiResponse)
            
            } else {
              let apiResponse = response.generate(false, 'Email Sent Successfully', 200, resolve)
                    res.status(200)
                    res.send(apiResponse)
     
            }
          });

    })
    .catch((err) => {
        console.log("errorhandler");
        console.log(err);
        res.status(err.status)
        res.send(err)
    })



} // end of password


verifyCode = (req, res) => {

validateUser = () => {
    console.log(req.body);
    return new Promise((resolve, reject) => {

        CodeModel.find({code: req.body.code}).exec((err, result) => {
            if(err) {
                let apiResponse = response.generate(true, 'Failed to update password', 500, null)
                reject(apiResponse)
            } else if(check.isEmpty(result)) {
                let apiResponse = response.generate(true, 'Not Found', 404, null)
                reject(apiResponse)
            } else {
                resolve(req);
                console.log('Result', result);
            }
        })
    })
}

    let savepassword = (retriveDetails) => {
        //console.log('retriveDetails /n ********************** /n',retriveDetails);
         console.log('userId', retriveDetails.body.userId);
        return new Promise((resolve, reject) => {
            UserModel.updateOne({userId: retriveDetails.body.userId},
                { $set: { password : passwordlib.hashpassword(retriveDetails.body.changePassword)}}).exec((err, result) => {
                                    if(err) {
                                        let apiResponse = response.generate(true, 'Failed to update password', 500, null)
                                        reject(apiResponse)
                                    } else if(check.isEmpty(result)) {
                                        let apiResponse = response.generate(true, 'Not Found', 404, null)
                                        reject(apiResponse)
                                    } else {
                                        resolve(result);
                                    }
                                })
        })
    }

    validateUser(req, res)
    .then(savepassword)
    .then((resolve) => {
        let apiResponse = response.generate(false, 'Password Successfully Saved', 200, null)
        res.send(apiResponse);

    })
      .catch((err) => {
        console.log("errorhandler");
        console.log(err);
        res.status(err.status)
        res.send(err)
    })
}




getAllDetails = (req, res) => {
   // console.log('getAllDetails',req);
    UserModel.find({isAdmin: false}).select(' -__v -_id -password').lean().exec((err, result) => {
        if(err) {
            let apiResponse = response.generate(true, 'Failed to find users', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            //let apiResponse = response.generate(false, 'All user Details Found', 200, result)
            res.send(result)
        }
    })
} // end of getAllDetails


getUserDetailsById = (req, res) => {

    MeetingModel.find({'recieverUserId': req.params.userId})
    .select(' -__v  -password')
    .lean()
    .exec((err, result) => {
        if(err) {
            let apiResponse = response.generate(true, 'Failed to find users', 500, null)
            res.send(apiResponse)
        } else if(check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'All user Details Found', 200, result)
            res.send(apiResponse)
        }
    })
}


addMeetingDetailsById =(req, res) => {
    //console.log('addMeetingDetailsById', req.body);

    let newMeeting = new MeetingModel ({
        userId: req.body.userId,
        title: req.body.title,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        draggable: req.body.draggable,
        itemId: shortid.generate(),
        when: req.body.when,
        where: req.body.where,
        purpose: req.body.purpose
    })

    //console.log('Before Saving /n', newMeeting)
    newMeeting.save((err, result) => {
        if (err) {
            logger.error(err.message, 'userController: createUser', 10)
            let apiResponse = response.generate(true, 'Failed to create New Meeting', 500, null)
            res.send(apiResponse)
        } else if(check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Result Found', 404, null)
            res.send(apiResponse)

        } else {
            let apiResponse = response.generate(false, 'Event Successfully Saved', 200, null)
            res.send(apiResponse);
        }
    })
}

deleteItemByItemId = (req, res) => {

    MeetingModel.findOneAndRemove({'itemId': req.body.itemId})
    .exec((err, result) => {
        if(err) {
            let apiResponse = response.generate(true, 'Failed to Delete Events', 500, null)
            res.send(apiResponse)
        } else if(check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Event Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Event Successfully Deleted', 200, result)
            res.send(apiResponse)
        }
    })
}

editItemById = (req, res) => {
let options = req.body


    MeetingModel.update({'itemId':req.body.itemId}, options)
    .exec((err, result) => {
        if(err) {
            let apiResponse = response.generate(true, 'Failed to delete Event', 500, null)
            res.send(apiResponse)
        } else if(check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            console.log('result', result);
            let apiResponse = response.generate(false, 'Event details edited', 200, result)
            res.send(apiResponse)
        }
    })

}

let logout = (req, res) => {

    AuthModal.findOneAndRemove({userId: req.user.userId}, (err, result) => {
        console.log('ERROR ********* \n', result)
    
        if(err) {
            logger.error(err, 'userController: saveToken', 10)
            let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
            res.send(apiResponse)
        } else if(check.isEmpty(result)) {
            logger.error(err, 'userController: saveToken', 10)
            let apiResponse = response.generate(true, 'Already Logout', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Logout successfuly', 200, null)
            res.send(apiResponse)
        }
    });
    
    } // end of the logout function.


module.exports = {

    signUpFunction: signUpFunction,
    loginFunction: loginFunction,
    logout: logout,
    forgotPassword: forgotPassword,
    getAllDetails: getAllDetails,
    getUserDetailsById: getUserDetailsById,
    addMeetingDetailsById: addMeetingDetailsById,
    deleteItemByItemId: deleteItemByItemId,
    editItemById: editItemById,
    verifyCode: verifyCode



}// end exports