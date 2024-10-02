const jwt = require("../plugins/jwt");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const upload = (tagetPath) => {
  return multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        // console.log("req.files",file,  req.files);
        const path = `upload/${tagetPath}/`;
        const cachePath = `upload/${tagetPath}/.cache`;
        const directory = fs.existsSync(path); //디렉토리 경로 입력
        const cacheDirectory = fs.existsSync(cachePath); //디렉토리 경로 입력
        if (!directory) {
          fs.mkdirSync(path, { recursive: true });
        }
        if (!cacheDirectory) {
          fs.mkdirSync(cachePath, { recursive: true });
        }
        cb(null, path);
      },

      // By default, multer removes file extensions so let's add them back
      filename: function (req, file, cb) {
        // console.log("file.originalname", file.originalname);
        const ext = path.extname(file.originalname);
        // const newName = jwt.getRandToken(4) + `${Date.now()}`;
        const newName = jwt.getRandomToken(4) + Date.now();
        // jwt.generatePassword(file.originalname);

        // console.log("ext", ext, newName);
        cb(null, `${newName}${ext}`);
        // cb(null, Date.now() + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, //크기 제한 : 5MB },
    fileFilter: function (req, file, cb) {
      if (
        !file.originalname.match(
          /\.(jpg|JPG|webp|jpeg|JPEG|png|PNG|gif|GIF|jfif|JFIF)$/
        )
      ) {
        req.fileValidationError = "사진파일만 허용합니다.";
        return cb(null, false);
      }
      cb(null, true);
    },
  });
};

module.exports = upload;
