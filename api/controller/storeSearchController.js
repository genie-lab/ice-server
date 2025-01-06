const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");

const storeSearchController = {

  //서치전체 목록수
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(TABLE.STORE_TAGS);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //서치 목록, 전체 태그 목록,어드민등급 제외한 테이블 목록 가져오기
  list: async function (req) {
    const options = req.query;
    const { query } = await sqlHelper.selectLimit(TABLE.STORE_TAGS, options);
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
      TABLE.STORE_TAGS,
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
      result = await storeSearchController.searchByTag(text);
    } else {
      result = await storeSearchController.searchByBoard(table, text);
    }
    return result;
  },


  // search에서 table, vi_id 추출
  async searchByTag(st_tag) {
    const sql = await sqlHelper.selectLimit(TABLE.STORE_TAGS, null, { st_tag }, ["st_table","vi_id",]); // where, 추출할것
    const [list] = await db.execute(sql.query, sql.values);
    const tables = {};
    for (const item of list) {
      if (!tables[item.st_table]) { tables[item.st_table] = []; }
      tables[item.st_table].push(item.vi_id);
    }
    return await storeSearchController.fetchSearchItems(tables);
  },

  // search에서 table, vi_id 추출
  async searchByBoard(st_table, text) {
    // search.vue에서 검색시 게시판검색으로 들어옴
    const temp = `SELECT vi_id FROM {{st_table}} WHERE vi_reply=0 AND vi_use=1 AND (vi_title LIKE '%${text}%' OR vi_content LIKE '%${text}% OR vi_history LIKE '%${text}%')`;
    const tables = {};
    if (st_table) {
      const sql = temp.replace("{{st_table}}", `${TABLE.VIP}${st_table}`);
      const [rows] = await db.execute(sql);
      tables[st_table] = [];
      for (const row of rows) {
        tables[st_table].push(row.vi_id);
      }
    } else {
      const allTables = await storeSearchController.storeList();
      for (const table of allTables) {
        tables[table.st_table] = [];
        const sql = temp.replace("{{st_table}}",`${TABLE.VIP}${table.st_table}`);
        const [rows] = await db.execute(sql);

        tables[table.st_table] = [];
        for (const row of rows) {
          tables[table.st_table].push(row.vi_id);
        }
      }
    }
    return await storeSearchController.fetchSearchItems(tables);
  },

  //태그 결과 가져오기
  async fetchSearchItems(tables) {
    const tableList = Object.keys(tables);
    const cols = ["vi_id","vi_name","vi_category","vi_title","vi_summary","vi_update_at",];
    const result = [];

    for (const st_table of tableList) {
      if (tables[st_table].length == 0) continue;
      const confSql = await sqlHelper.selectLimit(TABLE.STORE, null, { st_use:1, st_table }, ["st_title",]); // where, 뽑아낼것
      const [[config]] = await db.execute(confSql.query, confSql.values);
      if (!config)  continue;

      const table = `${TABLE.VIEW}${st_table}`;
      const sql = await sqlHelper.selectIn(table, "vi_id", tables[st_table], cols); // table, where,tables[st_table]===> IN({1}),뽑아낼것
      const [rows] = await db.execute(sql.query, sql.values);
      for (const row of rows) {
        row.st_table = st_table;
        row.st_title = config.st_title;
        const tagSql = await sqlHelper.selectLimit(TABLE.STORE_TAGS,null,{ st_table, vi_id: row.vi_id }, ["st_tag"]); // 뽑아낼것은 st_tag
        const [tagRows] = await db.execute(tagSql.query, tagSql.values);
        row.tags = [];
        for (const tag of tagRows) {
          row.tags.push(tag.st_tag);
        }
        result.push(row);
      }
    }

    return result;
  },

  //전체 태그 가져오기
  async tagList() {
    const sql = `SELECT DISTINCT st_tag FROM ${TABLE.STORE_TAGS}`;
    const [rows] = await db.execute(sql);
    const arr = [];
    for (const row of rows) {
      arr.push(row.st_tag);
    }
    return arr;
  },
  //board list 전체 가져오기
  async storeList() {
    //access메뉴 등급빼고 가져오기 WHERE  st_read_level < ${LV.SUPER} and st_write_level < ${LV.ADMIN}
    const sql = `SELECT st_table, st_title FROM ${TABLE.STORE} WHERE st_list_level < 6 AND st_read_level < 6 AND st_use=1`; //관리자이하
    const [rows] = await db.execute(sql);
    return rows;
  },
  //태그 추가
  tagAdd: async function (table, vi_id, wrTags) {
    // st_table, vi_id == pk
    //등록전 전체 삭제
    await storeSearchController.tagDel(table, vi_id);
    const tags = JSON.parse(wrTags)
    //등록
    for (const st_tag of tags) {
      const { query,values } = await sqlHelper.insert(TABLE.STORE_TAGS, {st_tag,st_table:table,vi_id,});
      await db.execute( query,values );
    }
  },
  //태그 삭제
  tagDel: async function (table, vi_id) {
    const isTags = await sqlHelper.selectLimit(TABLE.STORE_TAGS,null, {vi_id}, [' count(*) as cnt ']);
    const [[{cnt}]]=await db.execute(isTags.query,isTags.values);

    const cols ={vi_id,st_table:table}
    if(cnt>0){
      const {query,values } = await sqlHelper.del(TABLE.STORE_TAGS, cols);
      await db.execute(query,values);
    }
  },
};
module.exports = storeSearchController;
