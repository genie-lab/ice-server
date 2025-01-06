const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { tagAdd } = require("./storeSearchController");

const storeGoodController = {

  //좋아요싫어요 가져오기 목록
  listByWhere: async function (req,res) {
    const member = req.user[0];
    if (!member) { return res.json({ err: "회원만 가능합니다" }) }
    const st_table = req.params.st_table;
    const mb_id = member.mb_id;
    const good = await storeGoodController.getCount(st_table,  1); //좋아요==1
    const bad = await storeGoodController.getCount(st_table,  2); //싫어요==2
    const goodFlag = await storeGoodController.getFlag(st_table,  mb_id); //내 의사플래그
    return { good, bad, goodFlag };
  },
  // 좋아요 싫어요 총갯수 //내부용
  getCount: async function (st_table,  bg_flag){
    const { query, values } = await sqlHelper.selectLimit(TABLE.STORE_GOOD, null, {st_table,  bg_flag}, ['COUNT(*) AS cnt'] );
    const [[{cnt}]] = await db.execute(query, values);
    return cnt
  },
  // 내가 얻은 좋아요 싫어요 총갯수 //내부용
  getFlag: async function (st_table, mb_id){
    const { query, values } = await sqlHelper.selectLimit(TABLE.STORE_GOOD, null, {st_table, mb_id}, ['bg_flag'] );
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
    const st_table = req.params.st_table;
    const mb_id = member.mb_id;

    //같은 것 두번 눌렀을 때는 goodFlag를 0으로 만들어야 함
    const storedFlag = await storeGoodController.getFlag(st_table, mb_id); //내 의사플래그
    if(bg_flag==storedFlag){
      //기존 아이디 삭제
      const { query, values } = await sqlHelper.del(TABLE.STORE_GOOD, {st_table,  mb_id});
      await db.execute(query, values); //좋아요싫어요 삭제
      const good = await storeGoodController.getCount(st_table, 1); //좋아요 갯수
      const bad = await storeGoodController.getCount(st_table,  2); //싫어요 갯수
      return { good, bad, goodFlag:0 };
    }else{
      //기존 아이디 삭제
      const { query, values } = await sqlHelper.del(TABLE.STORE_GOOD, {st_table,  mb_id});
      await db.execute(query, values); //좋아요싫어요 삭제

      //좋아요 추가
      const payload = {
        st_table,  mb_id, bg_flag,
        bg_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      };
      const yes = await sqlHelper.insert(TABLE.STORE_GOOD, payload);
      await db.execute(yes.query, yes.values);
      const good = await storeGoodController.getCount(st_table,  1); //좋아요 갯수
      const bad = await storeGoodController.getCount(st_table,  2); //싫어요 갯수
      const goodFlag = await storeGoodController.getFlag(st_table,  mb_id); //내 의사플래그

      return { good, bad, goodFlag };
    }
  },
};
module.exports = storeGoodController;
