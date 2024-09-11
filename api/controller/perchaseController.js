const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE, DATABASE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const perchaseController = {
  //전체 카테고리들 get
  categories: async function (req) {
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.OPTIONS,
      null,
      cols
    );
    // console.log(query, values);
    const [rows] = await db.execute(query, values);
    // console.log(rows);
    return rows;
  },
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.PERCHASE);
    // console.log(">>>>>>>>>>", query);
    const [[{ rowsCount }]] = await db.execute(query);
    console.log(">>>>>>>>>>", rowsCount);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const reqQuery = req._parsedUrl.search; //req.query는 url과 같이 req.param은 객체    `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    const options = qs.parse(reqQuery, { ignoreQueryPrefix: true }); //?삭제
    console.log(options);
    // const options = {
    //   rowsPerPage: "50",
    //   page: "1",
    //   sortBy: ["pc_update_at"],
    //   type: ["desc"],
    // };
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.PERCHASE, options);
    console.log(query);
    // const sql = "select * from view_options   where  pc_id = 51";
    // const [rows] = await db.execute(sql);
    const [rows] = await db.execute(query);
    //문자열을 배열로,,
    // rows.forEach((element) => {
    //   let str = element.pc_text;
    //   const arr = str.split(",");
    //   console.log(arr);
    //   element.pc_text = arr;
    // });
    console.log(rows);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    //where절 여러개
    // const cols = {
    //   pc_name: "은행",
    // };

    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["pc_update_at"],
      type: ["desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.PERCHASE,
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

    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.PERCHASE,
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
    const payload = {
      pc_category: req.body.pc_category.toString(),
      pc_company: req.body.pc_company,
      pc_manager: req.body.pc_manager,
      pc_phone: req.body.pc_phone,
      pc_addr1: req.body.pc_addr1,
      pc_addr2: req.body.pc_addr2,
      pc_ip_at: ip(),
      mb_id: "genie",
    };
    const { query, values } = await sqlHelper.insert(TABLE.PERCHASE, payload);
    const [insertDone] = await db.execute(query, values);
    console.log(insertDone);
    return insertDone;
  },
  //수정삭제 put
  edit: async function (req) {
    console.log(req._parsedUrl.search);
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    // console.log(cols);
    // const cols = {
    //   pc_id: 1,
    // };
    // const contents = ["국민", "우리", "기업", "네덜란드", "뉴욕", "캐나다"];
    const payload = {
      ...req.body,
      // pc_name: req.body.pc_name,
      // pc_text: req.body.pc_text,
      pc_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      pc_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.PERCHASE,
      payload,
      cols
    );
    const allVals = [...values, ...where];
    // console.log(query, allVals);

    const [editDone] = await db.execute(query, allVals);
    return editDone;
  },
  //수정삭제 put
  del: async function (req) {
    // const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    console.log(req.body);
    const cols = {
      pc_id: req.body.pc_id,
    };
    const payload = {
      pc_use: 0,
      pc_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      pc_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(
      TABLE.PERCHASE,
      payload,
      cols
    );
    console.log(query, values);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};
module.exports = perchaseController;
