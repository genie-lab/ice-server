const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const mainController = {
  //전체 카테고리들 get
  categories: async function (req) {
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.OPTIONS,
      null,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.MAIN);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const reqQuery = req._parsedUrl.search; //req.query는 url과 같이 req.param은 객체    `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    const options = qs.parse(reqQuery, { ignoreQueryPrefix: true }); //?삭제
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.MAIN, options);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    //where절 여러개
    // const cols = {
    //   st_name: "은행",
    // };

    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["st_update_at"],
      type: ["desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.MAIN,
      options,
      cols
    );
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
      VIEW_TABLE.MAIN,
      (options = null),
      cols,
      func
    );
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    const payload = {
      st_main: req.body.st_main,
      st_category: req.body.st_category.toString(),
      st_manager: req.body.st_manager,
      st_phone: req.body.st_phone,
      st_addr1: req.body.st_addr1,
      st_addr2: req.body.st_addr2,
      st_franchise_use: req.body.st_franchise_use,
      st_franchise_name: req.body.st_franchise_name,
      st_ip_at: ip(),
      mb_id: "genie",
    };
    const { query, values } = await sqlHelper.insert(TABLE.MAIN, payload);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 put
  edit: async function (req) {
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    const payload = {
      st_main: req.body.st_main,
      st_category: req.body.st_category.toString(),
      st_manager: req.body.st_manager,
      st_phone: req.body.st_phone,
      st_addr1: req.body.st_addr1,
      st_addr2: req.body.st_addr2,
      st_franchise_use: req.body.st_franchise_use,
      st_franchise_name: req.body.st_franchise_name,
      st_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      st_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(TABLE.MAIN, payload, cols);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //수정삭제 put
  del: async function (req) {
    const cols = {
      st_id: req.body.st_id,
    };
    const payload = {
      st_use: 0,
      st_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      st_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(TABLE.MAIN, payload, cols);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};
module.exports = mainController;
