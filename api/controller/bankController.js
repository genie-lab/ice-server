//db
const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const bankController = {
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.BANK);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    // console.log(req._parsedUrl.search); //req.query는 url과 같이 req.param은 객체

    const reqQuery = req._parsedUrl.search; //req.query는 url과 같이 req.param은 객체    `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    const options = qs.parse(reqQuery, { ignoreQueryPrefix: true }); //?삭제
    // const options = {
    //   rowsPerPage: "50",
    //   page: "1",
    //   sortBy: ["b_id", "b_update_at"],
    //   type: ["desc", "desc"],
    // };
    const { query } = await sqlHelper.selectLimit(VIEW_TABLE.BANK, options);
    // console.log(query);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    // console.log(cols);
    //where절 여러개
    // const cols = {
    //   b_account: "Zcidw5HO172",
    //   b_host: "신진이",
    // };

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
    // console.log(query, values);
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
    console.log(cols);
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.BANK,
      (options = null),
      cols,
      func
    );
    // console.log(query, values);
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    console.log(req.body);

    const symbolProperties = Object.getOwnPropertySymbols(req);
    // symbolProperties.forEach((s) => {
    //   console.log(s, ":", req[s]);
    // });
    // console.log(req[symbolProperties[2]].host); //localhost:4000
    // const b_ip = req[symbolProperties[2]].host;
    //b_name,b_account,b_host,b_location,b_ip_at,mb_id
    //https://www.npmjs.com/package/address
    const payload = {
      ...req.body, //{ b_name: '우리', b_account: '111111', b_host: 'ㅂㅂ', b_location: '11' }
      b_ip_at: ip(),
      mb_id: "genie",
    };
    // select * from view_bank WHERE b_account=? and b_host=?    [ 'Zcidw5HO172', '신진이' ]
    const { query, values } = await sqlHelper.insert(TABLE.BANK, payload);
    // console.log(query, values);
    const [insertDone] = await db.execute(query, values);
    // console.log(insertDone);
    return insertDone;
  },
  //수정삭제 post
  edit: async function (req) {
    console.log(req.body);
    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    console.log(cols);
    // const cols = {
    //   b_id: 202,
    // };
    const payload = {
      b_name: req.body.b_name,
      b_account: req.body.b_account,
      b_host: req.body.b_host,
      b_location: req.body.b_location,
      b_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      b_ip_at: ip(),
      mb_id: "genie",
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.BANK,
      payload,
      cols
    );
    const allVals = [...values, ...where];
    const [editDone] = await db.execute(query, allVals);
    console.log(editDone);
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
    console.log(query, values);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};

module.exports = bankController;
