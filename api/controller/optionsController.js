const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE, DATABASE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const optionsController = {
  //전체목록갯수 get
  tables: async function () {
    const query = `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = '${DATABASE.ICE}'`;
    const [rows] = await db.execute(query);
    if (rows?.length <= 0) return [];

    const str = Object.keys(rows[0])[0];
    const table_name = str === str.toLowerCase() ? str.toLowerCase() : str;
    // 키가 대문자인지 소문자인지 확인
    const tables = [];
    if (rows?.length > 0) {
      for (r in rows) {
        if (rows[r][table_name].indexOf("view_") <= -1) {
          tables.push(rows[r][table_name]);
        }
      }
    }
    return tables; //[]
  },
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.OPTIONS);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = req.query;
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.OPTIONS, options);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
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
      VIEW_TABLE.OPTIONS,
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
      op_table: req.body.op_table.toString(),
      op_name: req.body.op_name,
      op_text: req.body.op_text.toString(),
      op_ip_at: ip(),
      mb_id: "genie",
    };
    payload.op_table = payload.op_table.replace("은행", "bank");
    payload.op_table = payload.op_table.replace("지출", "expenditures");
    payload.op_table = payload.op_table.replace("선택", "options");
    payload.op_table = payload.op_table.replace("구입", "perchase");
    payload.op_table = payload.op_table.replace("판매", "sales");

    const { query, values } = await sqlHelper.insert(TABLE.OPTIONS, payload);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 put
  edit: async function (req) {
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    const payload = {
      op_main: req.body.op_main,
      op_table: req.body.op_table,
      op_name: req.body.op_name,
      op_text: req.body.op_text,
      op_use: req.body.op_use,
      op_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      op_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(
      TABLE.OPTIONS,
      payload,
      cols
    );
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //수정삭제 put
  del: async function (req) {
    const cols = {
      op_id: req.body.op_id,
    };
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
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};
module.exports = optionsController;
