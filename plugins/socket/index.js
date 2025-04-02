const { Server } = require("socket.io");
const redis = require("redis");
const redisAdapter = require("socket.io-redis");
const { instrument } = require("@socket.io/admin-ui");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
const { InMemorySessionStore } = require("./sessionStore.js");
const sessionStore = new InMemorySessionStore();
const configHandler = require("./configHandler");
const roomHandler = require("./roomHandler.js");
const Config = require("../../config.js");
const config = process.env.NODE_ENV =='development' ? Config.development : Config.production ;

const server = function (webServer) {
  const io = new Server(webServer, {
    cors: { origin: ["https://admin.socket.io", "*"] },
    credentials: true,
  });

  //redis
  //https://ittrue.tistory.com/318
  //c:/program files/Redis/redis-cli.exe 실행 후 ping
  // const redisClient = redisAdapter({
  //   host: config.REDIS.host,
  //   port: config.REDIS.port,
  // });
  // io.adapter(redisClient);
  const pubClient = redis.createClient({ host: config.REDIS.host, port: config.REDIS.port });
  const subClient = pubClient.duplicate();

  io.adapter(redisAdapter(pubClient, subClient));

  //https://admin.socket.io/admin
  //https://bcrypt-generator.com
  const bcrypt = require("bcrypt");
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

  instrument(io, {
    namespaceName: "/admin", // 확실히 "/admin"으로 설정
    auth: {
      type: "basic",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD_HASH
    },
  });



      // 사용자 이름 확인 연결 허용 나중에 다시 사용할 수 있도록 객체 username의 속성으로 추가됩니다 .
  io.use((socket, next) => {
    //session id

    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
      // find existing session
      const session = sessionStore.findSession(sessionID);
      if (session) {
        socket.sessionID = sessionID;
        socket.userID = session.userID;
        socket.username = session.username;
        return next();
      }
    }

    const username = socket.handshake.auth.userName;
    if (!username) {
      return next(new Error("invalid username"));
    }

    // create new session
    socket.sessionID = randomId();
    socket.userID = randomId();
    socket.username = username;
    const session = socket.sessionID;
    next();
  });

  io.on("connection", (socket) => {
    // handler 추가
    configHandler(io, socket);
    boardHandler(io, socket);
    socket.emit("session", {
      sessionID: socket.sessionID,
      userID: socket.userID,
    });

    socket.on("disconnection", () => {
      //socket연결 끊기
    });

    if (process.env.NODE_ENV == "development") {
      socket.onAny((event, ...args) => {
        console.log("socket", event, ...args);
      });
    }
  });

  return io;
};

module.exports = server;
