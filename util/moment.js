const moment = require("moment");
moment.locale("ko");
require("moment/locale/ko");
moment.updateLocale("ko", {
  longDateFormat: {
    L: "YYYY-MM-DD",
    LT: "YYYY-MM-DD HH:mm:ss",
  },
});

module.exports = moment;
