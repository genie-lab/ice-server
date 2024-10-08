const { Server } = require("socket.io");
const redisAdapter = require("socket.io-redis");
const { instrument } = require("@socket.io/admin-ui");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
const { InMemorySessionStore } = require("./sessionStore.js");
const sessionStore = new InMemorySessionStore();
const configHandler = require("./configHandler");
const roomHandler = require("./roomHandler.js");

const { REDIS_HOST, REDIS_PORT } = process.env;

const server = function (webServer) {
  const io = new Server(webServer, {
    cors: { origin: ["https://admin.socket.io", "*"] },
    credentials: true,
  });

  //redis
  //https://ittrue.tistory.com/318
  //c:/program files/Redis/redis-cli.exe 실행 후 ping
  const redisClient = redisAdapter({
    host: REDIS_HOST,
    port: REDIS_PORT,
  });
  io.adapter(redisClient);

  //https://admin.socket.io/
  //https://bcrypt-generator.com
  instrument(io, {
    namespaceName: "./admin",
    auth: {
      type: "basic",
      username: "genielab",
      password: "$2a$12$34KU8cLQYcDXKFa2sA1qCOzagz/K848q6J2uW2GtE0qpCkaLMzKxS",
    },
  });

  io.use((socket, next) => {
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
      const session = sessionStore.findSession(sessionID);
      if (session) {
        socket.sessionID = sessionID;
        socket.userId = session.userID;
        socket.username = session.username;
        return next();
      }
    }

    const username = socket.handshake.auth.userName;
    if (!username) {
      console.log("invalid username");
      // return next(new Error("invalid username"));
    }

    //create new session
    socket.sessionID = randomId();
    socket.userID = randomId();
    socket.username = username;
    next();
  });

  io.on("connection", (socket) => {
    //handler 추가
    configHandler(io, socket);
    roomHandler(io, socket);

    socket.emit("session", {
      sessionID: socket.sessionID,
      userID: socket.userID,
    });

    socket.on("disconnection", () => {});
    if (process.env.NODE_ENV == "development") {
      socket.onAny((event, ...args) => {
        console.log(`socket`, event, ...args);
      });
    }
  });

  return io;
};

module.exports = server;
