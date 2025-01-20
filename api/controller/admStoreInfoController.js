const db = require("../../plugins/mysql");
const { TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const moment = require("../../util/moment");
const { LV, isGrant } = require("../../util/level");
const { getIp } = require("../../util/lib");


const admStoreController = {

  //where절 목록 post
  listByWhere: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(TABLE.STORE_INFO,null,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },

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
};
module.exports = admStoreController;
