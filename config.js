const production = {
  PORT: 4000,
  DB: {
    host: "localhost",
    port: "3306",
    user: "ice",
    database: "ice",
    password: "ice",
  },
  REDIS: {
    host: "localhost",
    port: 6379,
  },
  SECRET_KEY: "$2a$12$U3fh66EhjEts.vUTORXno.DKg1b30h8Z26fZll8lHUoEKIsqKYLdK", //genieisbeautiful
  NODEMAILER: {
    user: "shingenie.lab@gmail.com",
    pass: "ddttisesefeqvrfp",
  },
};

const development = {
  PORT: 4000,
  DB: {
    host: "localhost",
    port: "3306",
    user: "ice",
    database: "ice",
    password: "ice",
  },
  REDIS: {
    host: "localhost",
    port: 6379,
  },
  SECRET_KEY: "$2a$12$U3fh66EhjEts.vUTORXno.DKg1b30h8Z26fZll8lHUoEKIsqKYLdK", //genieisbeautiful
  NODEMAILER: {
    user: "shingenie.lab@gmail.com",
    pass: "ddttisesefeqvrfp",
  },
  GOOGLE_CLIENT_ID:
    "1034466449853-t227jqn0f2d1acgdj6bujekdmaek4uio.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "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",
  CALLBACK_URL: "http://localhost:3000",
};

module.exports = { production, development };