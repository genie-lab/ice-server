require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
// pm2 프로세스간 데이터 공유등록
require("./plugins/pm2Bus");

(async function () {
  // app init
  const app = express();
  // const port = process.env.VUE_APP_SERVER_PORT || 3000;
  const port = require("./config")[process.env.NODE_ENV].PORT || 3000;
  const webServer = http.createServer(app);

  //logger
  const logger = require("./plugins/logger");
  global.$logger = logger;

  const ex = require("./plugins/ex");
  const query = ex.symbol();
  // $logger.info(query);


  const bcrypt = require("bcrypt");

  //socket
  global.$IO = require("./plugins/socket")(webServer);

  //설정정보 로드
  const configController = require("./api/controller/configController");
  //config load
  await configController.load();

  //cors
  const cors = require("cors");
  const corsOptions = {
    origin:["https://orangewebapp.net","http://localhost:4466","http://localhost:5436"],
    allowedHeaders: ['Content-Type', 'Authorization'], // 허용할 헤더
    credentials: true,    
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
  const redis = require("redis");
  const RedisStore = require("connect-redis").default;
  const redisClient = redis.createClient({
      url: "redis://localhost:6379",
  });

  redisClient.connect().catch(console.error);

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: "prefix:",
  });

  //-momery unleaked---------
app.set('trust proxy', 1);

// 환경이 프로덕션인지 확인
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  cookie:{
    secure: isProduction,  // 프로덕션 환경에서만 secure를 true로 설정
    maxAge: 1000 * 60 * 60 * 24 * 7, // 세션 유지 기간: 7일
    sameSite: 'none', // 크로스 도메인 요청에도 쿠키 전송 허용
  },
  store: redisStore,
  secret: 'genie-session-sercret',
  saveUninitialized: false,
  resave: false
}));

app.use(function(req,res,next){
if(!req.session){
    return next(new Error('Oh no')) //handle error
}
next() //otherwise continue
});

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
  const passport = require("./plugins/passport");
  passport(app);

  // global settings
  global.UPLOAD_PATH = path.join("upload/");
  fs.mkdirSync(UPLOAD_PATH, { recursive: true }); // 하위까지 모두만듦

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
})();
