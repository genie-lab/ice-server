const jwt = require("./jwt");
const { ip, ipv6, mac } = require("address");

module.exports = {
  /* repeat: function () {
    let query = [];
    for (let i = 0; i < 200; i++) {
      console.log(i);
      const b_account = jwt.getRandomToken(8);
      sql = `INSERT INTO ice.bank(b_name,b_account,b_host,b_location,b_ip_at,mb_id) VALUES ('국민','${b_account}${i}','신진이','홍대','localhost','genie')`;
      query.push(sql.concat(";"));
    }
    console.log(query.toString().replace(/;,/g, "; "));
    return query;
  }, */

  symbol: function () {
    const key = "b_id";
    const sb = Symbol("baa");
    const cols = {
      [key]: "test",
      [sb]: "sb",
      [Symbol("foo")]: false,
    };

    const symbolProperties = Object.getOwnPropertySymbols(cols);
    // console.log(symbolProperties); //
    // console.log(cols[symbolProperties[1]]); // 27
    console.dir(ip());
  },
};
