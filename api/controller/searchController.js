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
    // const options = {
    //   rowsPerPage: "50",
    //   page: "1",
    // };

    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD_TAGS,
      null, // options,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },


  // tag, board 검색
  async search({ type, text, table }) {
    let result = [];
    if (!text) return;
    type = type == "태그" ? type.replace("태그", "tag") : type;
    if (type == "tag") {
      result = await searchController.searchByTag(text);
    } else {
      result = await searchController.searchByBoard(table, text);
    }
    return result;
  },


  // search에서 table, wr_id 추출
  async searchByTag(bo_tag) {
    const sql = await sqlHelper.selectLimit(TABLE.BOARD_TAGS, null, { bo_tag }, ["bo_table","wr_id",]); // where, 추출할것
    const [list] = await db.execute(sql.query, sql.values);
    const tables = {};
    for (const item of list) {
      if (!tables[item.bo_table]) { tables[item.bo_table] = []; }
      tables[item.bo_table].push(item.wr_id);
    }
    return await searchController.fetchSearchItems(tables);
  },

  // search에서 table, wr_id 추출
  async searchByBoard(bo_table, text) {
    // search.vue에서 검색시 게시판검색으로 들어옴
    const temp = `SELECT wr_id FROM {{bo_table}} WHERE wr_reply=0 AND wr_use=1 AND (wr_title LIKE '%${text}%' OR wr_content LIKE '%${text}%' OR wr_summary LIKE '%${text}%')`;
    const tables = {};
    if (bo_table) {
      const sql = temp.replace("{{bo_table}}", `${TABLE.WRITE}${bo_table}`);
      const [rows] = await db.execute(sql);
      tables[bo_table] = [];
      for (const row of rows) {
        tables[bo_table].push(row.wr_id);
      }
    } else {
      const allTables = await searchController.boardList();
      for (const table of allTables) {
        tables[table.bo_table] = [];
        const sql = temp.replace("{{bo_table}}",`${TABLE.WRITE}${table.bo_table}`);
        const [rows] = await db.execute(sql);

        tables[table.bo_table] = [];
        for (const row of rows) {
          tables[table.bo_table].push(row.wr_id);
        }
      }
    }
    return await searchController.fetchSearchItems(tables);
  },

  //태그 결과 가져오기
  async fetchSearchItems(tables) {
    const tableList = Object.keys(tables);
    const cols = ["wr_id","wr_name","wr_category","wr_title","wr_summary","wr_update_at",];
    const result = [];

    for (const bo_table of tableList) {
      if (tables[bo_table].length == 0) continue;
      const confSql = await sqlHelper.selectLimit(TABLE.BOARD, null, { bo_use:1, bo_table }, ["bo_title",]); // where, 뽑아낼것
      const [[config]] = await db.execute(confSql.query, confSql.values);
      if (!config)  continue;

      const table = `${TABLE.VIEW}${bo_table}`;
      const sql = await sqlHelper.selectIn(table, "wr_id", tables[bo_table], cols); // table, where,tables[bo_table]===> IN({1}),뽑아낼것
      const [rows] = await db.execute(sql.query, sql.values);
      for (const row of rows) {
        row.bo_table = bo_table;
        row.bo_title = config.bo_title;
        const tagSql = await sqlHelper.selectLimit(TABLE.BOARD_TAGS,null,{ bo_table, wr_id: row.wr_id }, ["bo_tag"]); // 뽑아낼것은 bo_tag
        const [tagRows] = await db.execute(tagSql.query, tagSql.values);
        row.tags = [];
        for (const tag of tagRows) {
          row.tags.push(tag.bo_tag);
        }
        result.push(row);
      }
    }

    return result;
  },

  //전체 태그 가져오기
  async tagList() {
    const sql = `SELECT DISTINCT bo_tag FROM ${TABLE.BOARD_TAGS}`;
    const [rows] = await db.execute(sql);
    const arr = [];
    for (const row of rows) {
      arr.push(row.bo_tag);
    }
    return arr;
  },
  //board list 전체 가져오기
  async boardList() {
    //access메뉴 등급빼고 가져오기 WHERE  bo_read_level < ${LV.SUPER} and bo_write_level < ${LV.ADMIN}
    const sql = `SELECT bo_table, bo_title FROM ${TABLE.BOARD} WHERE bo_list_level < 6 AND bo_read_level < 6 AND bo_use=1`; //관리자이하
    const [rows] = await db.execute(sql);
    return rows;
  },
  //태그 추가
  tagAdd: async function (table, wr_id, wrTags) {
    // bo_table, wr_id == pk
    //등록전 전체 삭제
    await searchController.tagDel(table, wr_id);
    const tags = JSON.parse(wrTags)
    //등록
    for (const bo_tag of tags) {
      const { query,values } = await sqlHelper.insert(TABLE.BOARD_TAGS, {
        bo_tag,
        bo_table:table,
        wr_id,
      });
      await db.execute( query,values );
    }
  },
  //태그 삭제
  tagDel: async function (table, wr_id) {
    const isTags = await sqlHelper.selectLimit(TABLE.BOARD_TAGS,null, {wr_id}, [' count(*) as cnt ']);
    const [[{cnt}]]=await db.execute(isTags.query,isTags.values);

    const cols ={
      wr_id,
      bo_table:table
    }
    if(cnt>0){
      const {query,values } = await sqlHelper.del(TABLE.BOARD_TAGS, cols);
      await db.execute(query,values);
    }
  },
};
module.exports = searchController;
