const db = require("../../plugins/mysql");
const { TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const moment = require("../../util/moment");
const { LV, isGrant } = require("../../util/level");
const fs = require("fs");
const path = require("path");
const { getIp } = require("../../util/lib");


const admStoreController = {

  //전체목록갯수 get
  listCount: async function () {
    const sql = await sqlHelper.selectSimpleCount(TABLE.STORE_INFO, null, {in_use:1});
    const [[{ rowsCount }]] = await db.execute(sql.query, sql.values);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = {...req.query};
    const { query,values } = await sqlHelper.selectLimit(TABLE.STORE_INFO, options,);
    const [rows] = await db.execute(query,values);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(TABLE.STORE_INFO,null,cols);
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
      TABLE.STORE_INFO,(options = null),cols,func
    );
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    if (!isGrant(req, LV.ADMIN)) throw new Error("게시판 설정 권한이 없습니다.");
    const data = req.body;
    data.in_category = JSON.stringify(data.in_category);

    const payload = {
      ...data,
      in_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      in_update_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      in_ip:getIp(req),
      mb_id:req.user[0].mb_id
    };

    const { query, values } = await sqlHelper.insert(TABLE.STORE_INFO, payload);
    const [insertDone] = await db.execute(query, values);

    return insertDone;

  },
  // 게시판삭제복구

  //수정삭제 put
  edit: async function (req) {
    try {
      //관리자등급 확인
      if (!isGrant(req, LV.SUPER)) {
        throw new Error("수정권한이 없습니다.");
      }
      const {in_id} = req.body;
      const data = req.body;
      delete data?.in_table;
      delete data?.in_group;
      delete data?.in_id;
      delete data?.in_create_at;

      const payload = {
        ...data,
        in_update_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        in_ip:getIp(req),
        mb_id:req.user[0].mb_id
      };

      const edit =  await sqlHelper.edit(TABLE.STORE_INFO, payload, { in_id });
      const [editDone] = await db.execute(edit.query, edit.values);
      return editDone;

    } catch (e) {}

  },
  //정렬
  align: async function (req){
    const in_table = req.query
    let in_cate = req.body
    const in_category = JSON.stringify(in_cate)
    // 카테고리 업데이트
    const { query, values } = await sqlHelper.edit(TABLE.STORE_INFO, {in_category}, in_table);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },

  //수정삭제 put
  del: async function (req) {
    // adm_board use=0 wr_board 불러올때는 사용가능한 adm_board 불러오기
    const {in_id} = req.body
    const payload = {
      in_use: 0,
      in_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      in_ip: getIp(req),
      mb_id:req.user[0].mb_id
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE_INFO, payload, {in_id});
    const [delDone] = await db.execute(query, values);
    return delDone;
  },
  //수정복구 put
  restore: async function (req) {
    // adm_board use=0 wr_board 불러올때는 사용가능한 adm_board 불러오기
    const {in_table} = req.query
    const payload = {
      in_use: 1,
      in_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      in_ip: getIp(req),
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE_INFO, payload, {in_table});
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
};
module.exports = admStoreController;
