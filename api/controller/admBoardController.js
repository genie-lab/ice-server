const db = require("../../plugins/mysql");
const { TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { LV, isGrant } = require("../../util/level");
const fs = require("fs");
const path = require("path");


const admBoardController = {
  //전체 카테고리들 get
  categories: async function (req) {
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD,
      null,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //전체목록갯수 get
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(TABLE.BOARD);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = req.query;
    const { query } = await sqlHelper.selectLimit(TABLE.BOARD, options);
    const [rows] = await db.execute(query);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols = req.body;
    
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD,
      null,
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
    // console.log('cols',cols);
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD,
      (options = null),
      cols,
      func
    );
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    console.log(isGrant(req, LV.ADMIN));
    if (!isGrant(req, LV.ADMIN)) throw new Error("게시판 설정 권한이 없습니다.");
    const data = req.body;
    data.bo_category = JSON.stringify(data.bo_category);
    data.bo_sort = JSON.stringify(data.bo_sort);
    data.wr_fields = JSON.stringify(data.wr_fields);

    let sqls = fs.readFileSync(path.join(__dirname, "./write_table.sql")).toString();
    // console.log("sqls", sqls);

    sqls = sqls.replace(/{{table}}/g, data.bo_table);
    const sqlArr = sqls.split(";");

    // console.log("sqlArr", sqlArr);

    for (const sql of sqlArr) {
      if (sql.trim()) {
        //테이블 view 생성
        await db.execute(sql);
      }
    }

    const payload = {
      ...data,
      bo_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      bo_update_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    };
    const { query, values } = await sqlHelper.insert(TABLE.BOARD, payload);
    const [insertDone] = await db.execute(query, values);
    
    //링크파일 업로드폴더
    fs.mkdirSync(`${UPLOAD_PATH}/${data.bo_table}`, { recursive: true });
    fs.chmodSync(`${UPLOAD_PATH}/${data.bo_table}`, 0o707);
    
    return insertDone;

  },
  //수정삭제 put
  edit: async function (req) {
    try {
      //관리자등급 확인
      if (!isGrant(req, LV.SUPER)) {
        throw new Error("수정권한이 없습니다.");
      }
      const { bo_table } = req.params;
      const data = req.body;
      delete data.bo_table;
      data.bo_category = JSON.stringify(data.bo_category);
      data.bo_sort = JSON.stringify(data.bo_sort);
      data.wr_fields = JSON.stringify(data.wr_fields);
      delete data.bo_create_at;

      // 카테고리 추가삭제 및 수정있을시 기존것 확인 그리고 다른것 추출해서 write_ 파일 지울것
      const { query, values } = await sqlHelper.selectLimit(TABLE.BOARD, null, {bo_table}, ["bo_category"]);
      const [[originCategories]] = await db.execute(query, values);
      const arr = JSON.parse(originCategories.bo_category); // 원본

      if (arr.length > 0) {
        const compare = JSON.parse(data.bo_category);
        const delArr = arr.filter((c) => !compare.includes(c)); //1가지 카테고리가 있으면 이카테고리로 몇개 글이 있는지 파악하고 그만큼 포문돌려 지워줘야한다.
        const delCnt = delArr.length; // 1가지 카테고리가 있으면 이카테고리로 몇개 글이 있는지 파악하고 그만큼 포문돌려 지워줘야한다.

        for (let i = 0; i < delCnt; i++) {
          const { query, values } = await sqlHelper.selectLimit(
            `${TABLE.WRITE}${bo_table}`, null, { wr_category: delArr[i] }, ["COUNT(*) AS cnt"]
          ); // 해당 wr_id 가져오기
          const [[{ cnt }]] = await db.execute(query, values);
          // console.log('cnt',cnt);
          let delCheck = 0;
          if (cnt > 0) {
            //delArr 순차적으로 데이터 지워준다
            for (let j = 0; j < cnt; j++) {
              const { query, values } = await sqlHelper.selectLimit(
                `${TABLE.WRITE}${bo_table}`, null, { wr_category: delArr[i] },["wr_id"]
              ); // 해당 wr_id 가져오기
              const [[{ wr_id }]] = await db.execute(query, values);

              if (wr_id) {
                delCheck += await admBoardController.del(
                  bo_table,
                  wr_id
                );
              }
            }
          }
          // console.log("related del cate item cnt ", delCheck);
        }
      }

      const payload = {
        ...data,
        bo_update_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      };
      const sql = sqlHelper.Update(TABLE.BOARD, payload, { bo_table });
      const [rows] = await db.execute(sql.query, sql.values);
      // return rows.affectedRows == 1;

      return resData(
        STATUS.S200.result,
        STATUS.S200.resultDesc,
        moment().format("YYYY-MM-DD HH:mm:ss"),
        rows?.affectedRows == 1
      );
    } catch (e) {}

    const cols = qs.parse(req._parsedUrl.search, { ignoreQueryPrefix: true });
    const payload = {
      s_main: req.body.s_main,
      s_category: req.body.s_category.toString(),
      s_company: req.body.s_company,
      s_manager: req.body.s_manager,
      s_phone: req.body.s_phone,
      s_addr1: req.body.s_addr1,
      s_addr2: req.body.s_addr2,
      s_franchise_use: req.body.s_franchise_use,
      s_franchise_name: req.body.s_franchise_name,
      s_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      s_ip_at: ip(),
      mb_id: "hanna",
    };

    const { query, values } = await sqlHelper.edit(TABLE.BOARD, payload, cols);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //정렬
  align: async function (req){
    const bo_table = req.query
    let bo_cate = req.body
    const bo_category = JSON.stringify(bo_cate)
    // 카테고리 업데이트
    const { query, values } = await sqlHelper.edit(TABLE.BOARD, {bo_category}, bo_table);
    const [editDone] = await db.execute(query, values);
    return editDone;

    
  },
  //수정삭제 put
  del: async function (bo_table, wr_id) {
    const payload = {
      wr_use: 0,
      wr_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      wr_ip: ip(),
    };

    const { query, values } = await sqlHelper.edit(bo_table, payload, {wr_id});
    await db.execute(query, values);
  },
};
module.exports = admBoardController;
