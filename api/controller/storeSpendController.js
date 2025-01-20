const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { getIp, isEmpty, resData } = require("../../util/lib");
const STATUS = require("../../util/STATUS");

const storeSpendController = {


  //페이지 목록 get
  list: async function (req) {
    const options = req.body;
    const allMall = options.allMall
    const cols = allMall == 'true' || allMall == true  ? null : {st_table:options.table}

    if (options?.search) {
      const colnameSql = await sqlHelper.colnames(VIEW_TABLE.SPEND);
      const [colnames] = await db.execute(colnameSql);
      const searchCols = colnames.map((c) => {
        return c.COLUMN_NAME;
      });
      let idx = searchCols.indexOf('mb_id'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('sp_ip'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('st_table'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('st_title'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('sp_id'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('sp_day'); searchCols.splice(idx,1);
      const { query, values } = await sqlHelper.selectLimit(VIEW_TABLE.SPEND,options,cols,null,searchCols);
      const [rows] = await db.execute(query, values);
      const cnt = await sqlHelper.selectSimpleCount(VIEW_TABLE.SPEND, options,cols, searchCols)
      const [[{ rowsCount }]] = await db.execute(cnt.query,cnt.values);
      const data = {rowsCount,rows};
      return {
        status: STATUS.S200.result, //status
        message: STATUS.S200.resultDesc, //message
        resDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        data, //data
      };

    }else{
      const { query,values } = await sqlHelper.selectLimit(VIEW_TABLE.SPEND, options, cols);
      const [rows] = await db.execute(query,values);
      const cnt = await sqlHelper.selectSimpleCount(VIEW_TABLE.SPEND, null, cols)
      const [[{ rowsCount }]] = await db.execute(cnt.query,cnt.values);
      const data = {rowsCount,rows};
        return {
          status: STATUS.S200.result, //status
          message: STATUS.S200.resultDesc, //message
          resDate: moment().format("YYYY-MM-DD HH:mm:ss"),
          data, //data
        };
    }
  },
  //추가 post
  add: async function (req) {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    let payload = {
      ...req.body,
      sp_ip: getIp(req),
      mb_id: req.user[0].mb_id,
      sp_create_at: at, //시간새로
      sp_update_at: at, //시간새로
    };
    const { query, values } = await sqlHelper.insert(TABLE.STORE_SPEND,payload);
    const [insertDone] = await db.execute(query, values);
    if(insertDone.affectedRows==1){
      payload.sp_id=insertDone.insertId;
      delete payload.sp_ip;
    }
    return payload;
  },
  //수정삭제 put
  edit: async function (req) {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const data = req.body;
    const sp_id = data.sp_id;
    const index = data.index;
    delete data.index;
    delete data.sp_id;
    data.sp_spend = Number(data.sp_spend);
    let payload = {
      ...data,
      sp_ip: getIp(req),
      mb_id: req.user[0].mb_id,
      sp_update_at: at, //시간새로
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE_SPEND,payload,{sp_id});
    const [editDone] = await db.execute(query, values);
    if(editDone.affectedRows==1){
      payload.index = index;
      return payload;
    }else{

    }
  },
  //수정삭제 put
  del: async function (req) {
    const data = req.body;
    const sp_id = data.sp_id;
    delete data.index;
    delete data.sp_id;

    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    let payload = {
      ...data,
      sp_use:0,
      sp_ip: getIp(req),
      mb_id: req.user[0].mb_id,
      sp_update_at: at, //시간새로
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE_SPEND,payload,{sp_id});
    const [delDone] = await db.execute(query, values);
    return delDone;
  },
};
module.exports = storeSpendController;
