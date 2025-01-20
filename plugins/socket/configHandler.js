module.exports = (io, socket) => {
  const update = (data) => {
    //cf_key, cf_val
    io.emit("config:update", data);
  };

  const remove = (data) => {
    // cf_key만 들어옴
    io.emit("config:remove", data);
  };

  socket.on("config:update", update);
  socket.on("config:remove", remove);
};
