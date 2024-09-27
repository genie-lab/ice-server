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
  // console.log("member", member);
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
    console.log(req.body);

    const symbolProperties = Object.getOwnPropertySymbols(req);
    // symbolProperties.forEach((s) => {
    //   console.log(s, ":", req[s]);
    // });
    // console.log(req[symbolProperties[2]].host); //localhost:4000
    // const b_ip = req[symbolProperties[2]].host;
    //b_name,b_account,b_host,b_location,b_ip_at,mb_id
    //https://www.npmjs.com/package/address
    const payload = {
      ...req.body, //{ b_name: '우리', b_account: '111111', b_host: 'ㅂㅂ', b_location: '11' }
      b_ip_at: ip(),
      mb_id: "genie",
    };
    // select * from view_bank WHERE b_account=? and b_host=?    [ 'Zcidw5HO172', '신진이' ]
    const { query, values } = await sqlHelper.insert(TABLE.BANK, payload);
    // console.log(query, values);
    const [insertDone] = await db.execute(query, values);
    // console.log(insertDone);
    return insertDone;
  },
  //멤버 로그인 : 회원가입테이블에 로그인컬럼적용
  loginMember: async (req) => {},
  //수정
  edit: async (req) => {
    console.log(req.body);
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    console.log(cols);
    // const cols = {
    //   b_id: 202,
    // };
    const payload = {
      b_main: req.body.b_main,
      b_name: req.body.b_name,
      b_account: req.body.b_account,
      b_host: req.body.b_host,
      b_location: req.body.b_location,
      b_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      b_ip_at: ip(),
      mb_id: "genie",
    };

    const { query, values } = await sqlHelper.edit(TABLE.BANK, payload, cols);
    const [editDone] = await db.execute(query, values);
    // console.log(editDone);
    return editDone;
  },
  //삭제
  del: async (req) => {
    const cols = {
      b_id: req.body.b_id,
    };
    const payload = {
      b_use: 0,
      b_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      b_ip_at: ip(),
      mb_id: "genie",
    };

    const { query, values } = await sqlHelper.edit(TABLE.BANK, payload, cols);
    console.log(query, values);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //중복검사
  duplCheck: async (req) => {
    //함수
    const func = ["count(*) as duplCount"];
    //where절
    const cols = {
      b_name: req.body.b_name,
      b_account: req.body.b_account,
      b_host: req.body.b_host,
    };
    console.log(cols);
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.MEMBER,
      (options = null),
      cols,
      func
    );
    // console.log(query, values);
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
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
  //전체목록수
  listCount: async () => {
    const query = await sqlHelper.selectSimpleCount(TABLE.MEMBER);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //회원목록
  list: async (req) => {
    const reqQuery = req._parsedUrl.search; //req.query는 url과 같이 req.param은 객체    `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    const options = qs.parse(reqQuery, { ignoreQueryPrefix: true }); //?삭제
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
      console.log(query);
      return { rows, rowsCount: rowsCount };
    } else {
      const countQuery = await sqlHelper.selectSimpleCount(TABLE.MEMBER);
      const [[{ rowsCount }]] = await db.execute(countQuery);
      // console.log("options>", options);
      const { query } = await sqlHelper.selectLimit(TABLE.MEMBER, options);
      const [rows] = await db.execute(query);
      console.log(query);
      return { rows, rowsCount };
    }
  },
  //where절 목록
  listByWhere: async (req) => {
    const cols = req.body;
    // console.log(cols);
    //where절 여러개
    // const cols = {
    //   b_account: "Zcidw5HO172",
    //   b_host: "신진이",
    // };

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
    // console.log(query, values);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //google login screen
  //소셜로그인
  socialCallback: async (req) => {},
  //로그인구글
  loginGoogle: async (req, profile) => {
    let member = null;
    console.log("first", profile);
    try {
      const sql = sqlHelper.selectLimit(TABLE.MEMBER, null, {
        mb_email: profile.email,
      });

      const [[row]] = await db.execute(sql.query, sql.values);
      member = clearMemberField(row); // password를 제외한 모든 내용 출력
      // console.log("new member", member);
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
      // console.log("re member", member);
      const sql = sqlHelper.insert(TABLE.MEMBER, data);
      await db.execute(sql.query, sql.values);
    }

    return member;
  },
};

module.exports = memberController;
