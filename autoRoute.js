const fs = require("fs");
const path = require("path");

const autoRoute = function (root, app) {
  const dir = fs.readdirSync(path.join(__dirname, root), {
    withFileTypes: true,
  });

  dir.forEach((f) => {
    if (f.isDirectory()) {
      if (f.name != "controller") {
        //컨트롤러가 아닐때 재귀함수돌림
        arguments.callee(`${root}/${f.name}`, app);
      }
    } else {
      let moduleName = "/" + f.name.replace(/\.js/g, "");
      if (moduleName == "/index") {
        moduleName = "";
      }
      console.log(`${root}${moduleName}`, `.${root}/${f.name}`);
      app.use(`${root}${moduleName}`, require(`.${root}/${f.name}`));
    }
  });
};

module.exports = autoRoute;
