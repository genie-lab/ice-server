require("dotenv").config();
const { host, port, user, database, password } =
  require("../config")[process.env.NODE_ENV].DB;

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
        };
        const pool = mysql.createPool(config);
        instance = pool.promise();
      }
      return instance;
    },
  };
}

module.exports = createDatabase().getInstance();
