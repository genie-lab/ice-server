const jwt = require("./jwt");
const { ip, ipv6, mac } = require("address");

module.exports = {
  symbol: function () {
    const key = "b_id";
    const sb = Symbol("baa");
    const cols = {
      [key]: "test",
      [sb]: "sb",
      [Symbol("foo")]: false,
    };

    const symbolProperties = Object.getOwnPropertySymbols(cols);
    const str = "hello genie";
    const test = new RegExp(str);
  },
};
