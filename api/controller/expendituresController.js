const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");

const expendituresController = {
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.EXPENDITURES);
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
    const { query } = await sqlHelper.selectLimit(
      VIEW_TABLE.EXPENDITURES,
      options
    );
    // console.log(query);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    //where절 여러개
    const cols = {
      ep_fee: "지출액",
      ep_sender: "요금보내는사람",
    };
    //기간별

    //페이징
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["ep_id", "ep_create_at"],
      type: ["desc", "desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.EXPENDITURES,
      options,
      cols
    );
    // console.log(query, values);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //추가 post
  add: async function (req) {
    //https://www.npmjs.com/package/address
    // const payload = {
    //   ep_category: "취급항목",
    //   ep_fee: "지출액",
    //   ep_fee_date: "지출날짜",
    //   ep_sender: "요금보내는사람",
    //   ep_receiver: "요금받는사람",
    //   ep_phone: "요금받는사람연락처",
    //   ep_location: "지출담당주소",
    //   ep_ip_at: ip(),
    //   mb_id: "genie",
    // };
    const payload = {
      ep_category: "월세",
      ep_fee: "1백만",
      ep_fee_date: "2024-08-27 22:21:09",
      ep_sender: "신기백",
      ep_receiver: "홍길동",
      ep_phone: "01044668318",
      ep_location: "서대문",
      ep_ip_at: ip(),
      mb_id: "genie",
    };
    const { query, values } = await sqlHelper.insert(
      TABLE.EXPENDITURES,
      payload
    );
    console.log(query, values);
    const [insertDone] = await db.execute(query, values);
    return insertDone;
  },
  //수정삭제 post
  edit: async function (req) {
    const payload = {
      ep_category: "관리비",
      ep_fee: "1백만",
      ep_fee_date: "2024-08-27 22:21:09",
      ep_sender: "신기백",
      ep_receiver: "홍길동",
      ep_phone: "01044668318",
      ep_location: "서대문",
      ep_ip_at: ip(),
      mb_id: "genie",
    };
    const cols = {
      ep_id: 2,
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.EXPENDITURES,
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
      ep_use: 0,
      ep_ip_at: ip(),
      mb_id: "genie",
    };
    const cols = {
      ep_id: 2,
    };

    const { query, values, where } = await sqlHelper.edit(
      TABLE.EXPENDITURES,
      payload,
      cols
    );
    const allVals = [...values, ...where];
    console.log(query, allVals);
    const [editDone] = await db.execute(query, allVals);
    return editDone;
  },
};
module.exports = expendituresController;
