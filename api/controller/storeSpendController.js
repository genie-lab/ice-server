const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { getIp, isEmpty, resData } = require("../../util/lib");
const STATUS = require("../../util/STATUS");

const storeSpendController = {

  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.SPEND);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = req.query;
    console.log('options1', options);

    const allMall = options.allMall 
    console.log('options2', allMall);

    const cols = allMall == 'true' || allMall == true  ? null : {st_table:options.table}

    console.log('options3',options, cols);
    if (options?.search) {
      const colnameSql = await sqlHelper.colnames(VIEW_TABLE.SPEND);
      const [colnames] = await db.execute(colnameSql);
      console.log('colnames',colnames)
      const searchCols = colnames.map((c) => {
        return c.COLUMN_NAME;
      });
      console.log('searchCols',searchCols)
      const { query, values } = await sqlHelper.selectLimit(VIEW_TABLE.SPEND,options,cols,null,searchCols);
      console.log('query, values',query, values)
      const [rows] = await db.execute(query, values);
      console.log('rows',rows)
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
      console.log('rowsCount',rowsCount);
      const data = {rowsCount,rows};
        return {
          status: STATUS.S200.result, //status
          message: STATUS.S200.resultDesc, //message
          resDate: moment().format("YYYY-MM-DD HH:mm:ss"),
          data, //data
        };
    }
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    const options = {
      rowsPerPage: "50",
      page: "1",
      sortBy: ["ep_update_at"],
      type: ["desc"],
    };
    const { query, values } = await sqlHelper.selectLimit(
      VIEW_TABLE.SPEND,
      options,
      cols
    );
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
      VIEW_TABLE.SPEND,
      (options = null),
      cols,
      func
    );
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
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
    console.log('query,value',query,values)
    const [insertDone] = await db.execute(query, values);
    console.log('insertDone',insertDone)
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
