const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
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
  add: async (req) => {},
  //멤버 로그인 : 회원가입테이블에 로그인컬럼적용
  loginMember: async (req) => {},
  //수정
  edit: async (req) => {},
  //삭제
  del: async (req) => {},
  //중복검사
  duplCheck: async (req) => {},
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
  listCount: async (req) => {},
  //회원목록
  list: async (req) => {},
  //where절 목록
  listByWhere: async (req) => {},
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
