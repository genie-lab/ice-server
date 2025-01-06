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
  //전체 카테고리들 get =>컨피그에
  categories: async function (req) {
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.STORE,
      null,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //전체목록갯수 get
  listCount: async function () {
    const sql = await sqlHelper.selectSimpleCount(TABLE.STORE);
    const [[{ rowsCount }]] = await db.execute(sql.query, sql.values);
    return rowsCount;
  },
  //페이지 목록 get
  list: async function (req) {
    const options = {...req.query};
    const { query,values } = await sqlHelper.selectLimit(TABLE.STORE, options,);
    const [rows] = await db.execute(query,values);
    return rows;
  },
  //where절 목록 post
  listByWhere: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(TABLE.STORE,null,cols);
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
      TABLE.STORE,(options = null),cols,func
    );
    const [[{ duplCount }]] = await db.execute(query, values);
    return duplCount;
  },
  //추가 post
  add: async function (req) {
    if (!isGrant(req, LV.ADMIN)) throw new Error("게시판 설정 권한이 없습니다.");
    const data = req.body;
    data.st_category = JSON.stringify(data.st_category);
    data.st_sort = JSON.stringify(data.st_sort);
    data.vi_fields = JSON.stringify(data.vi_fields);
    data.st_ip = getIp(req)


    // let sqls = fs.readFileSync(path.join(__dirname, "./vip_table.sql")).toString();
    // sqls = sqls.replace(/{{table}}/g, data.st_table);
    // const sqlArr = sqls.split(";");

    // for (const sql of sqlArr) {
    //   if (sql.trim()) {
    //     //테이블 view 생성
    //     await db.execute(sql);
    //   }
    // }

    // 그룹생성
    const grp = await sqlHelper.selectLimit(TABLE.STORE,null,null,['max(st_group) as cnt']);
    const [[{cnt}]] = await db.execute(grp.query,grp.values);
    const st_group =  (cnt == null || cnt == undefined) ? 1 : cnt + 1;
    const payload = {
      st_group: st_group,
      ...data,
      st_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      st_update_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    const { query, values } = await sqlHelper.insert(TABLE.STORE, payload);
    const [insertDone] = await db.execute(query, values);

    //링크파일 업로드폴더
    fs.mkdirSync(`${UPLOAD_PATH}/${data.st_table}`, { recursive: true });
    fs.chmodSync(`${UPLOAD_PATH}/${data.st_table}`, 0o707);

    const stInfoPayload={
      in_group:st_group, in_table:data.st_table, in_title:data.st_title, in_items:[],
      in_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      in_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      in_ip: getIp(req),
      mb_id:req.user[0].mb_id
    }
    const stInfo = await sqlHelper.insert(TABLE.STORE_INFO,stInfoPayload)
    await db.execute(stInfo.query,stInfo.values)

    return insertDone;

  },
  // 게시판삭제복구

  //수정삭제 put
  edit: async function (req) {
    try {
      // //관리자등급 확인
      // if (!isGrant(req, LV.SUPER)) {
      //   throw new Error("수정권한이 없습니다.");
      // }
      const {st_table} = req.query;
      const data = req.body;
      delete data.st_table;
      data.st_category = JSON.stringify(data.st_category);
      data.st_sort = JSON.stringify(data.st_sort);
      data.vi_fields = JSON.stringify(data.vi_fields);
      delete data.st_create_at;
      // 카테고리 추가삭제 및 수정있을시 기존것 확인 그리고 다른것 추출해서 write_ 파일 지울것
      const { query, values } = await sqlHelper.selectLimit(TABLE.STORE, null, {st_table}, ["st_category"]);

      const [[originCategories]] = await db.execute(query, values);
      const arr = JSON.parse(originCategories.st_category); // 원본

      if (arr.length > 0) {
        const compare = JSON.parse(data.st_category);
        const compareArr = [];
        for(com in compare){
          compareArr.push(compare[com].name)
        }
        const delArr = arr.filter((c) => {
          return !compareArr.includes(c.name)
        }); //1가지 카테고리가 있으면 이카테고리로 몇개 글이 있는지 파악하고 그만큼 포문돌려 지워줘야한다.
        for (let i = 0; i < delArr?.length; i++) {
          const {query,values} = await sqlHelper.selectLimit(
            `${TABLE.VIP}${st_table}`,null,{ wr_category: delArr[i].name },["COUNT(*) AS cnt"]
          ); // 해당 wr_id 가져오기
          const [[{ cnt }]] = await db.execute(query,values);
          let delCheck = 0;
          if (cnt > 0) {
            //delArr 순차적으로 데이터 지워준다
            for (let j = 0; j < cnt; j++) {
              const {query,values} = await sqlHelper.selectLimit(
                `${TABLE.VIP}${st_table}`,null,{ wr_category: delArr[i].name },["wr_id"]
              ); // 해당 wr_id 가져오기
              const [[{ wr_id }]] = await db.execute(query,values);

              if (wr_id) {
                delCheck += await admStoreController.delBoardRow(`${TABLE.VIP}${st_table}`,wr_id, req);
              }
            }
          }
        }
      }

      const payload = {
        ...data,
        st_update_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      };
      const edit =  await sqlHelper.edit(TABLE.STORE, payload, { st_table });
      const [editDone] = await db.execute(edit.query, edit.values);
      return editDone;

    } catch (e) {}

  },
  //정렬
  align: async function (req){
    const st_table = req.query
    let st_cate = req.body
    const st_category = JSON.stringify(st_cate)
    // 카테고리 업데이트
    const { query, values } = await sqlHelper.edit(TABLE.STORE, {st_category}, st_table);
    const [editDone] = await db.execute(query, values);
    return editDone;
  },
  //게시판글 삭제 put
  delBoardRow: async function (wr_table, wr_id ,req) {
    const payload = {
      wr_use: 0,
      wr_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      wr_ip: getIp(req),
    };

    const { query, values } = await sqlHelper.edit(wr_table, payload, {wr_id});
    await db.execute(query, values);
  },
  //수정삭제 put
  del: async function (req) {
    // adm_board use=0 wr_board 불러올때는 사용가능한 adm_board 불러오기
    const {st_table} = req.body
    const payload = {
      st_use: 0,
      st_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      st_ip: getIp(req),
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE, payload, {st_table});
    await db.execute(query, values);

    const stInfoPayload={
      in_use: 0,
      in_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      in_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      in_ip: getIp(req),
      mb_id:req.user[0].mb_id
    }
    const stInfo = await sqlHelper.edit(TABLE.STORE_INFO, stInfoPayload, {in_table:st_table});
    const [stInfoDelDone] = await db.execute(stInfo.query, stInfo.values);
    return stInfoDelDone;
  },
  //수정복구 put
  restore: async function (req) {
    // adm_board use=0 wr_board 불러올때는 사용가능한 adm_board 불러오기
    const {st_table} = req.query
    const payload = {
      st_use: 1,
      st_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      st_ip: getIp(req),
    };
    const { query, values } = await sqlHelper.edit(TABLE.STORE, payload, {st_table});
    await db.execute(query, values);

    const stInfoPayload={
      in_use: 1,
      in_create_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      in_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      in_ip: getIp(req),
      mb_id:req.user[0].mb_id
    }
    const stInfo = await sqlHelper.edit(TABLE.STORE_INFO, stInfoPayload, {in_table:st_table});
    const [stInfoEditDone] = await db.execute(stInfo.query, stInfo.values);
    return stInfoEditDone;
  },
};
module.exports = admStoreController;
