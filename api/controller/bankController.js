//db
const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");

const bankController = {
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.BANK);
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
      sortBy: ["b_id", "b_create_at"],
      type: ["desc", "desc"],
    };
    // const sql = "select * from view_bank  ORDER BY  b_id desc , b_create_at desc    LIMIT 0 , 50;";
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.BANK, options);
    // console.log(query);
    const rows = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    console.log(req);
    //where절 여러개
    const cols = {
      b_account: "Zcidw5HO172",
      b_host: "신진이",
    };

    // const options = {
    //   rowsPerPage: "50",
    //   page: "1",
    //   sortBy: ["b_id", "b_create_at"],
    //   type: ["desc", "desc"],
    // };

    // select * from view_bank WHERE b_account=? and b_host=?    [ 'Zcidw5HO172', '신진이' ]
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.BANK,
      (options = null),
      cols
    );
    // console.log(query, values);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //중복체크 post
  duplCheck: async function () {
    const key = "b_account";
    const val = "oynFuiax199";
    const obj = {
      [key]: val,
    };
    //함수
    const func = ["count(*) as duplCount"];
    //where절
    const cols = {
      b_account: "oynFuiax199",
      b_host: "신진이",
      b_name: "국민",
    };

    // select * from view_bank WHERE b_account=? and b_host=?    [ 'Zcidw5HO172', '신진이' ]
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.BANK,
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
    const symbolProperties = Object.getOwnPropertySymbols(req);
    // symbolProperties.forEach((s) => {
    //   console.log(s, ":", req[s]);
    // });
    // console.log(req[symbolProperties[2]].host); //localhost:4000
    // const b_ip = req[symbolProperties[2]].host;
    //b_name,b_account,b_host,b_location,b_ip_at,mb_id
    //https://www.npmjs.com/package/address
    const payload = {
      b_name: "국민",
      b_account: "1212",
      b_host: "신진이",
      b_location: "서대",
      b_ip_at: ip(),
      mb_id: "genie",
    };
    // select * from view_bank WHERE b_account=? and b_host=?    [ 'Zcidw5HO172', '신진이' ]
    const { query, values } = await sqlHelper.insert(TABLE.BANK, payload);
    console.log(query, values);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 post
  edit: async function (req) {
    const payload = {
      b_name: "국민",
      b_account: "1212333",
      b_host: "신진이",
      b_location: "서대",
      b_ip_at: ip(),
      mb_id: "genie",
    };
    const cols = {
      b_id: 202,
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.BANK,
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
      b_use: 0,
      b_ip_at: ip(),
      mb_id: "genie",
    };
    const cols = {
      b_id: 202,
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.BANK,
      payload,
      cols
    );
    const allVals = [...values, ...where];
    console.log(query, allVals);
    const [editDone] = await db.execute(query, allVals);
    return editDone;
  },
};

module.exports = bankController;
