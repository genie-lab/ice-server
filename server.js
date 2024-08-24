require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");

const app = express();
// const port = process.env.VUE_APP_SERVER_PORT || 3000;
const port = require("./config")[process.env.NODE_ENV].PORT || 3000;
const webServer = http.createServer(app);

//logger
const logger = require("./plugins/logger");
global.$logger = logger;

// const ex = require("./plugins/ex");
// const query = ex.repeat();
// $logger.info(query);

//cors
const cors = require("cors");
const corsOptions = {
  origin: ["http://localhost:8080", "http://localhost:4466"],
  credential: true,
};
app.use(cors(corsOptions));

//body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//session
const session = require("express-session");
app.use(
  session({
    secret: "genie-session-sercret",
    resave: true,
    saveUninitialized: false,
  })
);

//socket
global.$IO = require("./plugins/socket")(webServer);

//memory process
let isDisableKeepAlive = false;
app.use((req, res, next) => {
  if (isDisableKeepAlive) {
    $logger.info(`keep alive ${isDisableKeepAlive}`);
    res.set("Connection", "close");
  }
  next();
});

//passport
// const passport = require("./plugins/passport");
// passport(app);

//thumbnail
const thumbnail = require("./plugins/thumbnail");
app.use("/upload/:_path", thumbnail(path.join(__dirname, "./upload")));

//autoRoute
const autoRoute = require("./autoRoute");
autoRoute("/api", app);

//app error
app.use("/api/*", (req, res) => {
  res.json({ err: "요청하신 API가 없습니다" });
});

//heap 메모리 overflow처리
const memSize = Object.entries(process.memoryUsage())[0][1];
$logger.info(`${(memSize / 1024 / 1024).toFixed(4)}MB, 힙메모리 사이즈`);

if (process.platform == "linux") {
  if (memSize > 150000000) {
    process.emit("SIGINT");
  }
}

//port listen
webServer.listen(port, () => {
  process.send("ready");
  $logger.info(`http://localhost:${port}`);
});

//isDisableKeepAlive true일때 프로세스 죽임
process.on("SIGINT", function () {
  isDisableKeepAlive = true;
  webServer.close(function () {
    $logger.info(`Server Close`);
    process.exit(0);
  });
});
