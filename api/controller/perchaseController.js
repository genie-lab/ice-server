const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
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
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.PERCHASE);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = req.query;
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.PERCHASE, options);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
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
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    const payload = {
      pc_main: req.body.pc_main,
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
    return insertDone;
  },
  //수정삭제 put
  edit: async function (req) {
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    const payload = {
      pc_main: req.body.pc_main,
      pc_category: req.body.pc_category.toString(),
      pc_company: req.body.pc_company,
      pc_manager: req.body.pc_manager,
      pc_phone: req.body.pc_phone,
      pc_addr1: req.body.pc_addr1,
      pc_addr2: req.body.pc_addr2,
      pc_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      pc_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(
      TABLE.PERCHASE,
      payload,
      cols
    );
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //수정삭제 put
  del: async function (req) {
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
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};
module.exports = perchaseController;
