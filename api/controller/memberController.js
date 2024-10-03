const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const db = require("../../plugins/mysql");
const qs = require("qs");
const sendMailer = require("../../plugins/senderMailer");
const sqlHelper = require("../../util/sqlHelper");
const STATUS = require("../../util/STATUS");
const moment = require("../../util/moment");
const { getIp, resData, isEmpty, deepCopy } = require("../../util/lib");
const { LV, isGrant } = require("../../util/level");
const jwt = require("../../plugins/jwt");
const fs = require("fs");
const path = require("path");
const { VUE_APP_SERVER_PORT } = process.env;

function clearMemberField(member) {
  delete member.mb_password;
  member.mb_birth = moment(member.mb_birth).format("LT");
  member.mb_create_at = moment(member.mb_create_at).format("LT");
  member.mb_update_at = moment(member.mb_update_at).format("LT");
  if (member.mb_login_at) {
    member.mb_login_at = moment(member.mb_login_at).format("LT");
  }
  if (member.mb_leave_at) {
    member.mb_leave_at = moment(member.mb_leave_at).format("LT");
  }
  if (member.mb_birth) {
    member.mb_birth = moment(member.mb_birth).format("L");
  }
  return member;
}

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
  if (member.mb_leave_at) {
    return "탈퇴회원입니다";
  }

  switch (member.mb_level) {
    case LV.BLOCK:
      "차단회원입니다";
      break;
    case LV.AWAIT:
      "대기입니다";
      break;
  }
}

const memberController = {
  //추가
  add: async (req) => {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);
    const payload = {
      ...req.body,
      mb_create_at: at,
      mb_create_ip: ip,
      mb_update_at: at,
      mb_update_ip: ip,
    };
    //추가할때는 탈퇴지우기
    delete payload.mb_leave_at;
    //파일추가
    const file = req?.files[0];
    if (file) {
      file.originalname = Buffer.from(file.originalname, "ascii").toString(
        "utf8"
      );
      // url만들기
      const { destination, filename } = req.files[0];
      const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;
      payload.mb_photo = url;
    } else {
      payload.mb_photo = "https://picsum.photos/500/300";
    }
    const { query, values } = await sqlHelper.insert(TABLE.MEMBER, payload);
    const [insertDone] = await db.execute(query, values);
    if (insertDone?.affectedRows == 1 && payload.mb_photo && file) {
      //files에 저장하기
      const filePayload = {
        f_field: TABLE.MEMBER,
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
    return { insertDone, url: payload.mb_photo };
  },
  //수정
  edit: async (req) => {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);
    const payload = {
      ...req.body,
      mb_update_at: at,
      mb_update_ip: ip,
    };
    // login시점 지우기
    delete payload.mb_login_at;
    //탈퇴변환
    if (payload.mb_leave_at === "true" || payload.mb_leave_at === true) {
      payload.mb_leave_at = at;
    } else if (
      payload.mb_leave_at === "false" ||
      payload.mb_leave_at === false
    ) {
      payload.mb_leave_at = null;
    } else {
      delete payload.mb_leave_at;
    }

    //파일있을때
    const file = req?.files[0];
    if (file) {
      file.originalname = Buffer.from(file.originalname, "ascii").toString(
        "utf8"
      );
      // url만들기
      const { destination, filename } = file;
      const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;
      payload.mb_photo = url;
      // 지울 사진파일 찾기
      const fileCols = {
        f_field: TABLE.MEMBER,
        f_fieldname: req.body.mb_idx,
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

    const { query, values } = await sqlHelper.edit(TABLE.MEMBER, payload, cols);
    const [editDone] = await db.execute(query, values);
    if (editDone?.affectedRows == 1 && payload.mb_photo && file) {
      //files에 저장하기
      const filePayload = {
        f_field: TABLE.MEMBER,
        f_fieldname: payload.mb_idx,
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
    return { editDone, url: payload.mb_photo };
  },
  //삭제
  del: async (req) => {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);
    const cols = {
      mb_idx: req.body.mb_idx,
    };
    const payload = {
      mb_update_at: at,
      mb_update_ip: ip,
      mb_leave_at: at,
    };

    const { query, values } = await sqlHelper.edit(TABLE.MEMBER, payload, cols);
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
      TABLE.MEMBER,
      (options = null),
      cols,
      func
    );
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //전체목록수
  listCount: async () => {
    const query = await sqlHelper.selectSimpleCount(TABLE.MEMBER);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //회원목록
  list: async (req) => {
    // const reqQuery = req._parsedUrl.search; //req.query는 url과 같이 req.param은 객체    `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    // const options = qs.parse(reqQuery, { ignoreQueryPrefix: true }); //?삭제
    const options = req.query;
    if (options?.search) {
      const colnameSql = await sqlHelper.colnames(TABLE.MEMBER);
      const [colnames] = await db.execute(colnameSql);
      const searchCols = colnames.map((c) => {
        return c.COLUMN_NAME;
      });

      const countQuery = await sqlHelper.selectSimpleCount(
        TABLE.MEMBER,
        options,
        searchCols
      );
      const [[{ rowsCount }]] = await db.execute(countQuery);

      const { query } = await sqlHelper.selectLimit(
        TABLE.MEMBER,
        options,
        null,
        null,
        searchCols
      );
      const [rows] = await db.execute(query);
      return { rows, rowsCount: rowsCount };
    } else {
      const countQuery = await sqlHelper.selectSimpleCount(TABLE.MEMBER);
      const [[{ rowsCount }]] = await db.execute(countQuery);
      const { query } = await sqlHelper.selectLimit(TABLE.MEMBER, options);
      const [rows] = await db.execute(query);
      return { rows, rowsCount };
    }
  },
  //where절 목록
  listByWhere: async (req) => {
    const cols = req.body;
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["b_update_at"],
      type: ["desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      TABLE.MEMBER,
      options,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //멤버 로그인 : 회원가입테이블에 로그인컬럼적용
  loginMember: async (req) => {},
  //로그아웃
  logout: async (req) => {},
  //탈퇴
  leave: async (req) => {},
  // 회원수정전 비밀번호 재확인
  checkPassword: async (req) => {},
  //아이디찾기
  findId: async (req) => {},
  //비밀번호찾기
  findPw: async (req) => {},
  // 비밀번호수정
  modifyPassword: async (req) => {},
  //google login screen
  //소셜로그인
  socialCallback: async (req) => {},
  //로그인구글
  loginGoogle: async (req, profile) => {
    let member = null;
    try {
      const sql = sqlHelper.selectLimit(TABLE.MEMBER, null, {
        mb_email: profile.email,
      });

      const [[row]] = await db.execute(sql.query, sql.values);
      member = clearMemberField(row); // password를 제외한 모든 내용 출력
    } catch (e) {
      // 없으면 새로 디비저장
      const ip = getIp(req);
      const at = moment().format("YYYY-MM-DD HH:mm:ss"); // 현재시간 LT 형식으로
      const data = {
        mb_id: profile.sub,
        mb_provider: "google",
        mb_password: "",
        mb_name: profile.name,
        mb_email: profile.email,
        mb_photo: profile.picture,
        mb_level: await getDefaultMemberLevel(),
        mb_create_at: at,
        mb_update_at: at,
        mb_create_ip: ip,
        mb_update_ip: ip,
      };
      member = data;
      const sql = sqlHelper.insert(TABLE.MEMBER, data);
      await db.execute(sql.query, sql.values);
    }

    return member;
  },
};

module.exports = memberController;
