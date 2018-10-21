const bcrypt = require('bcrypt')
const saltRounds = 10

let logger = require('../libs/loggerLib')


let hashpassword = (myPassword) => {
    console.log('hash', myPassword);
    let salt = bcrypt.genSaltSync(saltRounds)
    let hash = bcrypt.hashSync(myPassword, salt)
    return hash
}

let comparePassword = (oldPassword, hashPassword, cb) => {
    console.log('oldpassword', oldPassword)
    console.log('hashPassword', hashPassword)

    bcrypt.compare(oldPassword, hashPassword, (err,res) => {
        if(err) {
            logger.error(err.message, 'Comparison Error hashPassword', 5)
            cb(err, null)
        } else {
            cb(null, res)
        }
    })
}


module.exports = {
    hashpassword: hashpassword,
    comparePassword: comparePassword
}