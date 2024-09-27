module.exports = (io, socket) => {
  //방접속
  socket.on("room:join", (roomName) => {
    socket.join(roomName);
  });
  //방접속 배열
  socket.on("rooms:join", (arr) => {
    console.log("rooms:join", arr);
    arr.forEach((room) => {
      socket.join(room);
    });
  });
  // //방나가기
  socket.on("room:leave", (roomName) => {
    socket.leave(roomName);
  });

  //방나가기 배열
  socket.on("rooms:leave", (arr) => {
    arr.forEach((room) => {
      socket.leave(room);
    });
  });
};
