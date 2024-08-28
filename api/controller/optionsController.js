const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");

const optionsController = {
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.OPTIONS);
    const [[rowsCount]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function () {
    const reqQuery = `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    const paserQs = qs.parse(reqQuery, { ignoreQueryPrefix: true });
    // console.log(paserQs);
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["op_id", "op_create_at"],
      type: ["desc", "desc"],
    };
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.OPTIONS, options);
    console.log(query);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    //where절 여러개
    const cols = {
      op_name: "은행",
    };

    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["op_id", "op_create_at"],
      type: ["desc", "desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.OPTIONS,
      options,
      cols
    );
    // console.log(query, values);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //중복체크 post
  duplCheck: async function () {
    const key = "op_name";
    const val = "은행";
    const obj = {
      [key]: val,
    };
    //함수
    const func = ["count(*) as duplCount"];
    //where절
    const cols = {
      op_name: "은행",
    };
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.OPTIONS,
      (options = null),
      cols,
      func
    );
    console.log(query, values);
    const [[duplCount]] = await db.execute(query, values);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    // 지출 취급항목
    // 월세
    // 관리비
    // 요금보내는사람
    // 신기백
    // 신진이
    // 요금받는사람
    // 홍길동
    // 김길동
    // 지출담당주소
    // 서대문

    const contents = ["국민", "우리", "기업", "스위스", "뉴욕", "캐나다"];
    const payload = {
      op_name: "은행",
      op_text: contents.toString(),
      op_ip_at: ip(),
      mb_id: "genie",
    };
    const { query, values } = await sqlHelper.insert(TABLE.OPTIONS, payload);
    console.log(query, values);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 post
  edit: async function (req) {
    const contents = ["국민", "우리", "기업", "네덜란드", "뉴욕", "캐나다"];
    const payload = {
      op_name: "은행",
      op_text: contents.toString(),
      op_ip_at: ip(),
      mb_id: "hanna",
    };
    const cols = {
      op_id: 1,
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.OPTIONS,
      payload,
      cols
    );
    const allVals = [...values, ...where];
    console.log(query, allVals);
    const [editDone] = await db.execute(query, allVals);
    return editDone;
  },
  //수정삭제 post
  del: async function (req) {
    const payload = {
      op_use: 0,
      op_ip_at: ip(),
      mb_id: "hanna",
    };
    const cols = {
      op_id: 1,
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.OPTIONS,
      payload,
      cols
    );
    const allVals = [...values, ...where];
    console.log(query, allVals);
    const [editDone] = await db.execute(query, allVals);
    return editDone;
  },
};
module.exports = optionsController;
