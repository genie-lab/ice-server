const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");

const goodController = {
  
  //좋아요싫어요 가져오기 목록
  listByWhere: async function (req,res) {
    const member = req.user[0];
    if (!member) { return res.json({ err: "회원만 가능합니다" }) }
    const bo_table = req.params.table;
    const wr_id = req.params.id;
    const mb_id = member.mb_id;
    const good = await goodController.getCount(bo_table, wr_id, 1); //좋아요==1
    const bad = await goodController.getCount(bo_table, wr_id, 2); //싫어요==2
    const goodFlag = await goodController.getFlag(bo_table, wr_id, mb_id); //내 의사플래그
    return { good, bad, goodFlag };
  },
  // 좋아요 싫어요 총갯수 //내부용
  getCount: async function (bo_table, wr_id, bg_flag){
    const { query, values } = await sqlHelper.selectLimit(TABLE.BOARD_GOOD, null, {bo_table, wr_id, bg_flag}, ['COUNT(*) AS cnt'] );
    const [[{cnt}]] = await db.execute(query, values);
    return cnt
  },
  // 내가 얻은 좋아요 싫어요 총갯수 //내부용
  getFlag: async function (bo_table, wr_id, mb_id){
    const { query, values } = await sqlHelper.selectLimit(TABLE.BOARD_GOOD, null, {bo_table, wr_id, mb_id}, ['bg_flag'] );
    const [[me]] = await db.execute(query, values);
    let flag=0;
    if(me){ flag = me.bg_flag; }
    return flag
  },
  //좋아요 싫어요 추가
  add: async function (req,res) {
    const member = req.user[0];
    if (!member) { return res.json({ err: "회원만 가능합니다" }) }
    const { bg_flag } = req.body;
    const bo_table = req.params.table;
    const wr_id = req.params.id;
    const mb_id = member.mb_id;
    const payload = {
      bo_table, wr_id, mb_id, bg_flag,
      bg_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    };
    const { query, values } = await sqlHelper.insert(TABLE.SALES, payload); //좋아요싫어요 저장
    await db.execute(query, values);
    const good = await goodController.getCount(bo_table, wr_id, 1); //좋아요 갯수
    const bad = await goodController.getCount(bo_table, wr_id, 2); //싫어요 갯수
    const goodFlag = await goodController.getFlag(bo_table, wr_id, mb_id); //내 의사플래그
    return { good, bad, goodFlag };
  },
  //좋아요 싫어요 삭제
  del: async function (req,res) {
    const member = req.user[0];
    if (!member) { return res.json({ err: "회원만 가능합니다" }) }
    const bo_table = req.params.table;
    const wr_id = req.params.id;
    const mb_id = member.mb_id;
    const { query, values } = await sqlHelper.del(TABLE.BOARD_GOOD, {bo_table, wr_id, mb_id});
    await db.execute(query, values); //좋아요싫어요 삭제
    const good = await goodController.getCount(bo_table, wr_id, 1); //좋아요 갯수
    const bad = await goodController.getCount(bo_table, wr_id, 2); //싫어요 갯수
    const goodFlag = await goodController.getFlag(bo_table, wr_id, mb_id); //내 의사플래그
    return { good, bad, goodFlag };
  },
};
module.exports = goodController;
