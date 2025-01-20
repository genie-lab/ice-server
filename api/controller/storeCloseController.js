const db = require("../../plugins/mysql");
const { VIEW_TABLE, TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { getIp, isEmpty, resData } = require("../../util/lib");
const STATUS = require("../../util/STATUS");

const storeCloseController = {

  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(VIEW_TABLE.CLOSE);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = req.body;

    const allMall = options.allMall

    const cols = allMall == 'true' || allMall == true  ? null : {st_table:options.table}

    if (options?.search) {
      const colnameSql = await sqlHelper.colnames(VIEW_TABLE.CLOSE);
      const [colnames] = await db.execute(colnameSql);
      const searchCols = colnames.map((c) => {
        return c.COLUMN_NAME;
      });
      let idx = searchCols.indexOf('mb_id'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('cl_ip'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('st_table'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('st_title'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('cl_id'); searchCols.splice(idx,1);
      idx = searchCols.indexOf('cl_day'); searchCols.splice(idx,1);
      const { query, values } = await sqlHelper.selectLimit(VIEW_TABLE.CLOSE,options,cols,null,searchCols);
      const [rows] = await db.execute(query, values);
      const cnt = await sqlHelper.selectSimpleCount(VIEW_TABLE.CLOSE, options,cols, searchCols)
      const [[{ rowsCount }]] = await db.execute(cnt.query,cnt.values);
      const data = {rowsCount,rows};
      return {
        status: STATUS.S200.result, //status
        message: STATUS.S200.resultDesc, //message
        resDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        data, //data
      };

    }else{
      const { query,values } = await sqlHelper.selectLimit(VIEW_TABLE.CLOSE, options, cols);
      const [rows] = await db.execute(query,values);
      const cnt = await sqlHelper.selectSimpleCount(VIEW_TABLE.CLOSE, null, cols)
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
      VIEW_TABLE.CLOSE,
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
      VIEW_TABLE.CLOSE,
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
      cl_ip: getIp(req),
      mb_id: req.user[0].mb_id,
      cl_create_at: at, //시간새로
      cl_update_at: at, //시간새로
    };
    const { query, values } = await sqlHelper.insert(TABLE.STORE_CLOSE,payload);
    const [insertDone] = await db.execute(query, values);
    if(insertDone.affectedRows==1){
      payload.cl_id=insertDone.insertId;
      delete payload.cl_ip;
    }
    return payload;
  },
  //수정삭제 put
  edit: async function (req) {
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const data = req.body;
    const cl_id = data.cl_id;
    const index = data.index;
    delete data.index;
    delete data.cl_id;
    data.cl_close = Number(data.cl_close);
    let payload = {
      ...data,
      cl_ip: getIp(req),
      mb_id: req.user[0].mb_id,
      cl_update_at: at, //시간새로
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE_CLOSE,payload,{cl_id});
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
    const cl_id = data.cl_id;
    delete data.index;
    delete data.cl_id;

    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    let payload = {
      ...data,
      cl_use:0,
      cl_ip: getIp(req),
      mb_id: req.user[0].mb_id,
      cl_update_at: at, //시간새로
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE_CLOSE,payload,{cl_id});
    const [delDone] = await db.execute(query, values);
    return delDone;
  },
};
module.exports = storeCloseController;
