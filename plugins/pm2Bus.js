const pm2 = require("pm2");

pm2.launchBus(function (err, pm2_bus) {
  // config update 시 다른 프로세스 공ㅠ
  pm2_bus.on("config:update", function ({ data }) {
    if (data.cf_client) {
      $config.client[data.cf_key] = data.cf_val;
    } else {
      $config.server[data.cf_key] = data.cf_val;
    }
  });

  //cf_key 들어옴
  pm2_bus.on("config:remove", function ({ data }) {
    delete $config.client[data];
    delete $config.server[data];
  });

  //서버재시작
  pm2_bus.on("config:restart", function ({ packet }) {
    // console.log('{ packet }',{ packet });
    //리눅스 명령어
    const exec = require("child_process").exec;
    exec("pm2 reload all", (err) => {
      console.log("server restart msg", err);
    });
  });
});
