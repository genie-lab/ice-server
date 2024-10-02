require("dotenv").config();
const { host, port, user, database, password } =
  require("../config")[process.env.NODE_ENV].DB;
// console.log(require("../config")[process.env.NODE_ENV].DB);
// console.log(host, port, user, database, password);
const mysql = require("mysql2");

function createDatabase() {
  let instance = null;
  return {
    getInstance: function () {
      if (instance == null) {
        const config = {
          host: host,
          user: user,
          database: database,
          password: password,
          port: port,
          connectionLimit: 20,
          connectTimeout: 5000,
          // keepAliveInitialDelay: 10000, // 0 by default.
          // enableKeepAlive: true, // false by default.
        };
        const pool = mysql.createPool(config);
        instance = pool.promise();
      }
      return instance;
    },
  };
}

module.exports = createDatabase().getInstance();
