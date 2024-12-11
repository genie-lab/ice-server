const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const searchController = {
  
  //서치전체 목록수
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(TABLE.BOARD_TAGS);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //서치 목록, 전체 태그 목록,어드민등급 제외한 테이블 목록 가져오기
  list: async function (req) {
    const options = req.query;
    const { query } = await sqlHelper.selectLimit(TABLE.BOARD_TAGS, options);
    const [rows] = await db.execute(query);
    return rows;
  },
  //서치 where절 목록 특정테이블,또는 전체에서 검색
  listByWhere: async function (req) {
    const cols = req.body;
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["s_update_at"],
      type: ["desc"],
    };

    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD_TAGS,
      options,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //태그 목록
  tagList: async function (req) {
    const { query } = await sqlHelper.selectLimit(TABLE.BOARD_TAGS, null,['bo_tag']);
    const [rows] = await db.execute(query);
    return rows;
  },
  //태그 추가
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
  //태그 삭제
  del: async function (req) {
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
};
module.exports = searchController;
