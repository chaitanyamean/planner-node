const jwt = require('jsonwebtoken')
const shortid = require('shortid')
const secretKey = 'someVeryRandomStringThatNobodyCanGuess';


let generateToken = (data, cb) =>{
    try {
        let claims = {
          jwtid: shortid.generate(),
          iat: Date.now(),
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),
          sub: 'authToken',
          iss: 'edChat',
          data: data
        }
    
        //console.log('*********************clams*******\n', claims);
        let tokenDetails = {
          token: jwt.sign(claims, secretKey),
          tokenSecret : secretKey
        }
        cb(null, tokenDetails)
      } catch (err) {
       // console.log(err)
        cb(err, null)
      }
}

let verifyClaim = (token,secretKey,cb) => {
  // verify a token symmetric
  jwt.verify(token, secretKey, function (err, decoded) {
    if(err){
      console.log("error while verify token");
      console.log(err);
      cb(err,null)
    }
    else{
      console.log("user verified");
      console.log(decoded);
      cb(null,decoded);
    }  
 
 
  });
}


let verifyClaimWithoutSecret = (token,cb) => {
  // verify a token symmetric
  jwt.verify(token, secretKey, function (err, decoded) {
    if(err){
      console.log("error while verify token");
      console.log(err);
      cb(err,null)
    }
    else{
      console.log("user verified", decoded);
      cb (null,decoded)
    }  
 
 
  });


}// end verify claim 

module.exports = {
    generateToken: generateToken,
    verifyToken :verifyClaim,
    verifyClaimWithoutSecret: verifyClaimWithoutSecret


}