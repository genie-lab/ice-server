const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");

const optionsController = {
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.OPTIONS);
    // console.log(">>>>>>>>>>", query);
    const [[{ rowsCount }]] = await db.execute(query);
    // console.log(">>>>>>>>>>", rowsCount);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const reqQuery = req._parsedUrl.search; //req.query는 url과 같이 req.param은 객체    `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    const options = qs.parse(reqQuery, { ignoreQueryPrefix: true }); //?삭제
    // const options = {
    //   rowsPerPage: "50",
    //   page: "1",
    //   sortBy: ["op_update_at"],
    //   type: ["desc"],
    // };
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.OPTIONS, options);
    console.log(query);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    //where절 여러개
    // const cols = {
    //   op_name: "은행",
    // };

    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["op_update_at"],
      type: ["desc"],
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
  duplCheck: async function (req) {
    //함수
    const func = ["count(*) as duplCount"];
    //where절
    const cols = req.body;
    console.log(cols);
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.OPTIONS,
      (options = null),
      cols,
      func
    );
    console.log(query, values);
    const [[{ duplCount }]] = await db.execute(query, values);
    console.log(duplCount);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    console.log(req.body);
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

    const payload = {
      op_table: req.body.op_table.toString(),
      op_name: req.body.op_name,
      op_text: req.body.op_text.toString(),
      op_ip_at: ip(),
      mb_id: "genie",
    };
    const { query, values } = await sqlHelper.insert(TABLE.OPTIONS, payload);
    console.log(query, values);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 put
  edit: async function (req) {
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    console.log(cols);
    // const cols = {
    //   op_id: 1,
    // };
    // const contents = ["국민", "우리", "기업", "네덜란드", "뉴욕", "캐나다"];
    const payload = {
      op_name: req.body.op_name,
      op_text: req.body.op_text,
      op_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      op_ip_at: ip(),
      mb_id: "hanna",
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
  //수정삭제 put
  del: async function (req) {
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    console.log(cols);
    // const cols = {
    //   op_id: 1,
    // };
    const payload = {
      op_use: 0,
      op_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      op_ip_at: ip(),
      mb_id: "hanna",
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
