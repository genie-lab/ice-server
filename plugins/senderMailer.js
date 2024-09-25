const nodemailer = require("nodemailer");

const { NODEMAILER_USER, NODEMAILER_PASS } = $config.server;

const transPoter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: NODEMAILER_USER,
    pass: NODEMAILER_PASS,
  },
});

// 싱글톤 패턴 구동시 첫 실행
function sendMailer() {
  let instance = null;
  return {
    getInstance: function () {
      if (instance == null) {
        instance = async (from, to, subject, html) => {
          const info = await transPoter.sendMail({
            from: `${from} <${NODEMAILER_USER}>`,
            to,
            subject,
            html,
          });
          // console.log("sendMailer info", info);
          return info;
        };
      }
      return instance;
    },
  };
}

module.exports = sendMailer().getInstance();
