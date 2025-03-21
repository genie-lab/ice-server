const STATUS = require("../util/STATUS");
const moment = require("../util/moment");
const lib = require("../util/lib");

module.exports = {
  deepCopy(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    const result = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      result[key] = lib.deepCopy(obj[key]);
    }
    return result;
  },

  modelCall: async (fn, ...args) => {
    try {
      const result = await fn(...args);
      return result;
    } catch (e) {
      $logger.error(e);
    }
  },

  getIp(req) {
    const ip = req.ip;
    switch (ip) {
      case "::::ffff:127.0.0.1":
        return ip.replace("::::ffff:127.0.0.1", "127.0.0.1");
      case "::1":
        return ip.replace("::1", "127.0.0.1");

      case "::ffff:":
        return ip.replace("::ffff:", "");

      default:
        break;
    }
  },
  fileSize: (x) => {
    const s = ["bytes", "KB", "MB", "GB", "TB", "PB"];
    const e = Math.floor(Math.log(x) / Math.log(1024));
    return (x / Math.pow(1024, e)).toFixed(2) + " " + s[e];
  },

  //응답데이터 공통함수
  resData: (status, message, resDate, data) => {
    return { status, message, resDate, data };
  },

  //빈 값 체크
  isEmpty(value) {
    if (
      value == "" ||
      value == null ||
      value == "null" ||
      value == undefined ||
      (value != null && typeof value == "object" && !Object.keys(value).length)
    ) {
      return true; // 값 없음
    } else {
      return false; // 값 있음
    }
  },
};
