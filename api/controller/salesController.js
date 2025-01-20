const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const salesController = {
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
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.SALES);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = req.query;
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.SALES, options);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["s_update_at"],
      type: ["desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.SALES,
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
      VIEW_TABLE.SALES,
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
      s_main: req.body.s_main,
      s_category: req.body.s_category.toString(),
      s_company: req.body.s_company,
      s_manager: req.body.s_manager,
      s_phone: req.body.s_phone,
      s_addr1: req.body.s_addr1,
      s_addr2: req.body.s_addr2,
      s_franchise_use: req.body.s_franchise_use,
      s_franchise_name: req.body.s_franchise_name,
      s_ip_at: ip(),
      mb_id: "genie",
    };
    const { query, values } = await sqlHelper.insert(TABLE.SALES, payload);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 put
  edit: async function (req) {
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    const payload = {
      s_main: req.body.s_main,
      s_category: req.body.s_category.toString(),
      s_company: req.body.s_company,
      s_manager: req.body.s_manager,
      s_phone: req.body.s_phone,
      s_addr1: req.body.s_addr1,
      s_addr2: req.body.s_addr2,
      s_franchise_use: req.body.s_franchise_use,
      s_franchise_name: req.body.s_franchise_name,
      s_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      s_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(TABLE.SALES, payload, cols);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //수정삭제 put
  del: async function (req) {
    const cols = {
      s_id: req.body.s_id,
    };
    const payload = {
      s_use: 0,
      s_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      s_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(TABLE.SALES, payload, cols);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};
module.exports = salesController;
