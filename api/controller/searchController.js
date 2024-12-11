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
    const { query,values } = await sqlHelper.selectLimit(TABLE.BOARD_TAGS, null,['bo_tag']);
    const [rows] = await db.execute(query,values);
    return rows;
  },
  //태그 추가
  tagAdd: async function (table, wr_id, wrTags) {
    // bo_table, wr_id == pk
    //등록전 전체 삭제
    await searchController.tagDel(table, wr_id);
    const tags = JSON.parse(wrTags)
    console.log('tags',tags);
    //등록
    for (const bo_tag of tags) {
      const { query,values } = await sqlHelper.insert(TABLE.BOARD_TAGS, {
        bo_tag,
        bo_table:table,
        wr_id,
      });

      console.log('query,values',query,values);

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
      console.log('query,values ',query,values );
      await db.execute(query,values);
    }
  },
};
module.exports = searchController;
