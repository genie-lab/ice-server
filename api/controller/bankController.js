//db
const db = require("../../plugins/mysql");
const TABLE = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");

const bankController = {
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(TABLE.VIEW_BANK);
    const [[rowsCount]] = await db.execute(query);
    return rowsCount;
  },

  list: async function () {
    const reqQuery = `?rowsPerPage=50&page=1&sortBy=b_id&type=desc&sortBy=b_craete_at&type=desc`;
    const paserQs = qs.parse(reqQuery, { ignoreQueryPrefix: true });
    /* {
  rowsPerPage: '50',
  page: '0',
  sortBy: [ 'b_id', 'b_craete_at' ],
  type: [ 'desc', 'desc' ]
} */
    console.log(paserQs);
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["b_id", "b_craete_at"],
      type: ["desc", "desc"],
    };
    // const sql = "select * from view_bank  ORDER BY  b_id desc , b_create_at desc    LIMIT 0 , 50;";
    const query = await sqlHelper.selectLimit(TABLE.VIEW_BANK, options);
    console.log(query);
    const rows = await db.execute(query);
    return rows;
  },
};
module.exports = bankController;
