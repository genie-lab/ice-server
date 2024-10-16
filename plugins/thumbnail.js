const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const imageSize = require("image-size");

const thumbnail = function (uploadPath) {
  // console.log("destFile", uploadPath);

  //app.use하려면 라우터거쳐야한다
  return async function (req, res, next) {
    //패스
    const _path = `${uploadPath}/${req.params._path}`;
    let srcFile = `${_path}${req.path}`;
    // console.log("_path", _path, srcFile);
    //파일정보
    const fileInfo = path.parse(req.path);
    // console.log("fileInfo", fileInfo);
    const regx = /\\/g;
    srcFile = srcFile.replace(regx, "/");
    // console.log("srcFile", srcFile);

    if (!fs.existsSync(srcFile)) {
      return res.status(400).json({ err: "file not found" });
    }
    // console.log("fs.existsSync(srcFile)", fs.existsSync(srcFile));

    try {
      const dim = imageSize(srcFile);
      // console.log("dim", dim);

      if (dim.type != "jpg" && dim.type != "png") {
        return res.end(fs.readFileSync(srcFile));
      }

      //요청사이즈 http://localhost:5000/upload/memberPhoto/test55.jpg?w=80&h=1000
      const w = parseInt(req.query.w) || 0;
      const h = parseInt(req.query.h) || 0;

      //요청사이즈 없으면
      if (w == 0 && h == 0) {
        return res.end(fs.readFileSync(srcFile));
      }

      //캐시폴더
      const destPath = _path + "/.cache";
      fs.mkdirSync(destPath, { recursive: true });
      const destFile = `${destPath}/${fileInfo.name}_${w}_${h}${fileInfo.ext}`;
      if (fs.existsSync(destFile)) {
        return res.end(fs.readFileSync(destFile));
      }

      await sharp(srcFile)
        .resize(w || null, h || null)
        .toFile(destFile);
      return res.end(fs.readFileSync(destFile)); //thumbnail
    } catch (error) {
      return res.end(fs.readFileSync(srcFile));
    }
  };
};

module.exports = thumbnail;
