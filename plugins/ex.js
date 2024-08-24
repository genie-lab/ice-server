const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const imageSize = require("image-size");

const thumbnail = function (uploadPath) {
  // 전달받은 경로 memberPhoto
  // console.log("uploadPath>>>>>>>>>.", uploadPath);
  return async function (req, res, next) {
    // console.log("req.params._path>>>>>>>>>.", req.params._path);

    const _path = ${uploadPath}/${req.params._path};
    const srcFile = ${_path}${req.path}; // 원본파일경로 --> thumbname server 등록
    // console.log("srcFile>>>>>>>>>.", srcFile);

    // 파일 정보
    const fileInfo = path.parse(req.path);
    // console.log("fileInfo>>>>>>>>>.", fileInfo);

    if (!fs.existsSync(srcFile)) {
      return res.status(400).json({ err: "file not found" });
    }

    try {
      // 원본정보
      const dim = imageSize(srcFile);
      // console.log("dim>>>>>>>>>.", dim);

      if (dim.type != "jpg" && dim.type != "png") {
        return res.end(fs.readFileSync(srcFile)); // 확장자 없으면 그냥 원본 보내줌  gif
      }

      //요청싸이즈
      const w = parseInt(req.query.w) || 0;
      const h = parseInt(req.query.h) || 0;
      // http://localhost:5000/upload/memberPhoto/test55.jpg?w=80&h=1000
      // console.log("wh>>>>>>>>>.", w, h);

      // 요청사이즈가 둘다 없다면
      if (w == 0 && h == 0) {
        //원본을 보내준다
        return res.end(fs.readFileSync(srcFile)); //원본
      }

      //캐쉬 폴더 생성
      const destPath = _path + "/.cache";
      // console.log("destPath>>>>>>>>>.", destPath);

      fs.mkdirSync(destPath, { recursive: true }); // 없으면 생성

      // 캐쉬 파일 명
      const destFile = ${destPath}/${fileInfo.name}_${w}_${h}${fileInfo.ext};
      // console.log("destFile>>>>>>>>>.", destFile);

      // 캐쉬된게 있으면 캐쉬파일을 보내준다
      if (fs.existsSync(destFile)) {
        return res.end(fs.readFileSync(destFile)); //요청 줄인 파일
      }

      //cache file save
      await sharp(srcFile)
        .resize(w  null, h  null)
        .toFile(destFile);
      return res.end(fs.readFileSync(destFile)); //썸네일
    } catch (e) {
      return res.end(fs.readFileSync(srcFile)); // 썸네일없으면 원본으로 처리 예)pdf원본처리
    }
  };
};

module.exports = thumbnail;