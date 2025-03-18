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
  // console.log(bcrypt.hashSync("genie-lab", 12));
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

  // console.log("🔹 ADMIN_USERNAME:", process.env.ADMIN_USERNAME);
  // console.log("🔹 ADMIN_PASSWORD_HASH:", process.env.ADMIN_PASSWORD_HASH);
  instrument(io, {
    namespaceName: "/admin", // 확실히 "/admin"으로 설정
    auth: {
      type: "basic",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD_HASH
    },
  });



  // io.use((socket, next) => {
  //   console.log('socket', socket, );
  //   const sessionID = socket.handshake.auth.sessionID;
  //   console.log('sessionID handshake', sessionID, );
  //   if (sessionID) {
  //     const session = sessionStore.findSession(sessionID);
  //     if (session) {
  //       socket.sessionID = sessionID;
  //       socket.userId = session.userID;
  //       socket.username = session.username;
  //       return next();
  //     }
  //   }

  //   console.log('socket.handshake',socket.handshake.auth);
  //   const username = socket.handshake.auth.userName;
  //   if (!username) {
  //     // console.log("invalid username");
  //     // return next(new Error("invalid username"));
  //   }

  //   //create new session
  //   socket.sessionID = randomId();
  //   socket.userID = randomId();
  //   console.log('socket.userID','socket.sessionID ',socket.sessionID ,socket.userID);
  //   socket.username = username;
  //   next();
  // });

  io.on("connection", (socket) => {
    //handler 추가
    configHandler(io, socket);
    roomHandler(io, socket);

    socket.emit("session", {
      sessionID: socket.sessionID,
      userID: socket.userID,
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userID} disconnected`);
    });
    
    if (process.env.NODE_ENV == "development") {
      socket.onAny((event, ...args) => {
        console.log(`socket`, event, ...args);
      });
    }
  });

  return io;
};

module.exports = server;
