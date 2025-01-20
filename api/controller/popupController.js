const { TABLE } = require("../../util/TABLE");
const db = require("../../plugins/mysql");
const qs = require("qs");
const sqlHelper = require("../../util/sqlHelper");
const moment = require("../../util/moment");
const { getIp } = require("../../util/lib");
const { LV } = require("../../util/level");
const fs = require("fs");

// 레벨체크
async function getDefaultMemberLevel() {
  // 디비에가서 최초 회원가입한 사람은 super유저
  const sql = sqlHelper.SelectSimple(TABLE.MEMBER, null, [`COUNT(*) AS cnt`]);
  const [[rows]] = await db.execute(sql.query, sql.values);
  if (rows.cnt > 0) {
    return LV.MEMBER;
  } else {
    return LV.SUPER;
  }
}
// 로그인 정책
function loginRules(member) {
  if (member.pu_leave_at) {
    return "탈퇴회원입니다";
  }

  switch (member.pu_level) {
    case LV.BLOCK:
      "차단회원입니다";
      break;
    case LV.AWAIT:
      "대기입니다";
      break;
  }
}

const popupController = {
  //추가
  add: async (req) => {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);
    const payload = {
      ...req.body,
      pu_create_at: at,
      pu_update_at: at,
      mb_id:req.user[0].mb_id
    };
    //파일추가
    const file = req?.files[0];
    if (file) {
      file.originalname = Buffer.from(file.originalname, "ascii").toString(
        "utf8"
      );
      // url만들기
      const { destination, filename } = req.files[0];
      const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;
      payload.pu_photo = url;
    } else {
      const random = Math.floor(Math.random() * 10);
      payload.pu_photo = `https://picsum.photos/500/300?random=${random}`;
    }
    const { query, values } = await sqlHelper.insert(TABLE.POPUP, payload);
    const [insertDone] = await db.execute(query, values);
    if (insertDone?.affectedRows == 1 && payload.pu_photo && file) {
      //files에 저장하기
      const filePayload = {
        f_field: TABLE.POPUP,
        f_fieldname: insertDone.insertId,
        f_originalname: file.originalname,
        f_encoding: file.encoding,
        f_mimetype: file.mimetype,
        f_destination: file.destination,
        f_filename: file.filename,
        f_path: file.path,
        f_size: file.size,
      };
      const { query, values } = await sqlHelper.insert(
        TABLE.FILES,
        filePayload
      );
      await db.execute(query, values);
    }
    return { insertDone, url: payload.pu_photo };
  },
  //수정
  edit: async (req) => {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const payload = {
      mb_id: req.body.mb_id,
      pu_comment: req.body.pu_comment,
      pu_content: req.body.pu_content,
      pu_id: req.body.pu_id,
      pu_period: req.body.pu_period,
      pu_photo: req.body.pu_photo,
      pu_route: req.body.pu_route,
      pu_start_date: req.body.pu_start_date,
      pu_display: req.body.pu_display,
      pu_update_at: at,
    };
    //파일있을때
    const file = req?.files[0];
    if (file) {
      file.originalname = Buffer.from(file.originalname, "ascii").toString(
        "utf8"
      );
      // url만들기
      const { destination, filename } = file;
      const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;
      payload.pu_photo = url;
      // 지울 사진파일 찾기
      const fileCols = {
        f_field: TABLE.POPUP,
        f_fieldname: req.body.pu_id,
      };
      const { query, values } = await sqlHelper.selectLimit(
        TABLE.FILES,
        null,
        fileCols
      );
      const [rows] = await db.execute(query, values);
      // 파일 인덱스로 destination path: 'upload\\member\\p8uf1727855103850.jpg'
      // 폴더존재하면 파일삭제/디비삭제
      if (rows?.length > 0) {
        for (const i in rows) {
          let filename = rows[i].f_filename;
          let ext = filename.split(".");
          ext = ext[ext?.length - 1];
          filename = filename.replace(`.${ext}`, "");
          const cachePath = `${rows[i].f_destination}.cache`;
          const cacheDir = fs.readdirSync(cachePath);
          for (const c of cacheDir) {
            if (c.startsWith(filename)) {
              try {
                fs.unlinkSync(`${cachePath}/${c}`);
              } catch (e) {}
            }
          }
          if (fs.existsSync(rows[i].f_path)) {
            //원본지움
            try {
              fs.unlinkSync(rows[i].f_path);
            } catch (e) {}
          }
        }
        // db에서 내용지우기
        const { query, values } = await sqlHelper.del(TABLE.FILES, fileCols);
        await db.execute(query, values);
      }
    }

    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });

    const { query, values } = await sqlHelper.edit(TABLE.POPUP, payload, cols);
    const [editDone] = await db.execute(query, values);
    if (editDone?.affectedRows == 1 && payload.pu_photo && file) {
      //files에 저장하기
      const filePayload = {
        f_field: TABLE.POPUP,
        f_fieldname: payload.pu_id,
        f_originalname: file.originalname,
        f_encoding: file.encoding,
        f_mimetype: file.mimetype,
        f_destination: file.destination,
        f_filename: file.filename,
        f_path: file.path,
        f_size: file.size,
      };
      const { query, values } = await sqlHelper.insert(
        TABLE.FILES,
        filePayload
      );
      await db.execute(query, values);
    }
    return { editDone, url: payload.pu_photo };
  },
  //삭제
  del: async (req) => {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const cols = {
      pu_id: req.body.pu_id,
    };
    const payload = {
      pu_update_at: at,
      pu_use: 0,
    };

    const { query, values } = await sqlHelper.edit(TABLE.POPUP, payload, cols);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //중복검사
  duplCheck: async (req) => {
    //함수
    const func = ["count(*) as duplCount"];
    //where절
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.POPUP,
      (options = null),
      cols,
      func
    );
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //전체목록수
  listCount: async () => {
    const query = await sqlHelper.selectSimpleCount(TABLE.POPUP);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //회원목록
  list: async (req) => {
    const options = req.query;
    if (options?.search) {
      const colnameSql = await sqlHelper.colnames(TABLE.POPUP);
      const [colnames] = await db.execute(colnameSql);
      const searchCols = colnames.map((c) => {return c.COLUMN_NAME;});
      const countQuery = await sqlHelper.selectSimpleCount(TABLE.POPUP,options,searchCols);
      const [[{ rowsCount }]] = await db.execute(countQuery.query,countQuery.values);

      const { query } = await sqlHelper.selectLimit(TABLE.POPUP,options,null,null,searchCols);
      const [rows] = await db.execute(query);
      return { rows, rowsCount: rowsCount };
    } else {
      const countQuery = await sqlHelper.selectSimpleCount(TABLE.POPUP);
      const [[{ rowsCount }]] = await db.execute(countQuery.query,countQuery.values);
      const { query } = await sqlHelper.selectLimit(TABLE.POPUP, options);
      const [rows] = await db.execute(query);
      return { rows, rowsCount };
    }
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols={pu_id:Number(req.query?.id),}
    const { query, values } = await sqlHelper.selectLimit(TABLE.POPUP,null,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //where절 목록
  displayList: async (req) => {
    // 날짜 지난 것 걸러내기
    // pu_display == 1인 것만 가져오기
    // pu_use == 1인 것민 가져오기
    // 보여줄 최신 날짜 순으로 정렬하기
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD')
    const query = ` select * from popup where pu_start_date > '${yesterday} 23:59:59' and pu_use=1 and pu_display=1 order by pu_start_date asc `;
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록
  get: async (req) => {
    // 날짜 지난 것 걸러내기
    // pu_display == 1인 것만 가져오기
    // pu_use == 1인 것민 가져오기
    // 보여줄 최신 날짜 순으로 정렬하기
    const query = ` select * from popup where pu_start_at >= now() and pu_use=1 and pu_display=1 order by pu_start_at asc `;
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록
  set: async (req) => {
    let body = req.body;

    //파일추가
    const files = req?.files;
    if (files?.length > 0) {
      for (let i = 0; i < files.length; i++) {
        files[i].originalname = Buffer.from(
          files[i].originalname,
          "ascii"
        ).toString("utf8");
        // url만들기
        const { destination, filename, fieldname } = files[i];
        const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;

        // blob to url
        srcUrl && wr_content.indexOf(filename) > -1;
        if (url && pu_comment.indexOf(fieldname) > -1) {
          pu_comment = pu_comment.replace(fieldname, url);
        }
      }
      // 내용저장
      const payload = {
        pu_comment: pu_comment,
      };

      // 파일저장
      const { query, values } = await sqlHelper.insert(TABLE.POPUP, payload);
      const [insertDone] = await db.execute(query, values);
      if (insertDone?.affectedRows == 1 && files?.length > 0) {
        //files에 저장하기
        const filePayload = {
          f_field: TABLE.POPUP,
          f_fieldname: insertDone.insertId,
          f_originalname: file.originalname,
          f_encoding: file.encoding,
          f_mimetype: file.mimetype,
          f_destination: file.destination,
          f_filename: file.filename,
          f_path: file.path,
          f_size: file.size,
        };
        const { query, values } = await sqlHelper.insert(
          TABLE.FILES,
          filePayload
        );
        await db.execute(query, values);
      }
    }
  },
  // set: async (req) => {
  //   let body = req.body;

  //   //파일추가
  //   const files = req?.files;
  //   if (files?.length > 0) {
  //     for (let i = 0; i < files.length; i++) {
  //       files[i].originalname = Buffer.from(
  //         files[i].originalname,
  //         "ascii"
  //       ).toString("utf8");
  //       // url만들기
  //       const { destination, filename, fieldname } = files[i];
  //       const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;

  //       // blob to url
  //       srcUrl && wr_content.indexOf(filename) > -1;
  //       if (url && pu_comment.indexOf(fieldname) > -1) {
  //         pu_comment = pu_comment.replace(fieldname, url);
  //       }
  //     }
  //     // 내용저장
  //     const payload = {
  //       pu_comment: pu_comment,
  //     };

  //     // 파일저장
  //     const { query, values } = await sqlHelper.insert(TABLE.POPUP, payload);
  //     const [insertDone] = await db.execute(query, values);
  //     if (insertDone?.affectedRows == 1 && files?.length > 0) {
  //       //files에 저장하기
  //       const filePayload = {
  //         f_field: TABLE.POPUP,
  //         f_fieldname: insertDone.insertId,
  //         f_originalname: file.originalname,
  //         f_encoding: file.encoding,
  //         f_mimetype: file.mimetype,
  //         f_destination: file.destination,
  //         f_filename: file.filename,
  //         f_path: file.path,
  //         f_size: file.size,
  //       };
  //       const { query, values } = await sqlHelper.insert(
  //         TABLE.FILES,
  //         filePayload
  //       );
  //       await db.execute(query, values);
  //     }
  //   }
  // },
};

module.exports = popupController;
