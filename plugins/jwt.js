const jwt = require("jsonwebtoken");
const randToken = require("rand-token");
const crypto = require("crypto");

const SECRET_KEY = require("../config")[process.env.NODE_ENV].SECRET_KEY;
const options = {
  algorithm: "HS256",
  issuer: "genie",
};

const token = {
  getRandomToken(len = 64) {
    return randToken.generate(len);
  },

  //crypto password
  generatePassword(password) {
    return crypto
      .pbkdf2Sync(password, SECRET_KEY, 10, 64, "sha512")
      .toString("base64");
  },

  //crypto password
  createHash(password) {
    return crypto.createHash("sha512").update(password).digest("base64");
  },

  // get token
  getToken(user) {
    const payload = {
      mb_id: user.mb_id, //pk
    };
    return jwt.sign(payload, SECRET_KEY, options);
  },

  //valid check
  verify(token) {
    try {
      return jwt.verify(token, SECRET_KEY);
    } catch (error) {
      return { err: error.message };
    }
  },
};

module.exports = token;
