//db
const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const bankController = {
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
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.BANK);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = req.query;
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.BANK, options);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["b_update_at"],
      type: ["desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.BANK,
      options,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //중복체크 post
  duplCheck: async function (req) {
    const key = "b_account";
    const val = "oynFuiax199";
    const obj = {
      [key]: val,
    };
    //함수
    const func = ["count(*) as duplCount"];
    //where절
    const cols = {
      b_name: req.body.b_name,
      b_account: req.body.b_account,
      b_host: req.body.b_host,
    };
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.BANK,
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
      ...req.body, //{ b_name: '우리', b_account: '111111', b_host: 'ㅂㅂ', b_location: '11' }
      b_ip_at: ip(),
      mb_id: "genie",
    };
    const { query, values } = await sqlHelper.insert(TABLE.BANK, payload);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 post
  edit: async function (req) {
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
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
    return editDone;
  },
  //수정삭제 post
  del: async function (req) {
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
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};

module.exports = bankController;
