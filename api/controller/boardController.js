const db = require("../../plugins/mysql");
const { TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { LV, isGrant } = require("../../util/level");
const fs = require("fs");
const path = require("path");


const boardController = {
  //전체 카테고리들 get
  menuList: async function (req) {
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,null,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //게시글 추가
  add: async function (req) {
    // if (!isGrant(req, LV.ADMIN)) throw new Error("게시판 설정 권한이 없습니다.");
    const data = req.body;
    data.bo_category = JSON.stringify(data.bo_category);
    data.bo_sort = JSON.stringify(data.bo_sort);
    data.wr_fields = JSON.stringify(data.wr_fields);
    data.bo_ip = ip()

    let sqls = fs.readFileSync(path.join(__dirname, "./write_table.sql")).toString();
    sqls = sqls.replace(/{{table}}/g, data.bo_table);
    const sqlArr = sqls.split(";");

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
    const { query, values } = await sqlHelper.insert(`${TABLE.WRITE}${table}`, payload);
    const [insertDone] = await db.execute(query, values);
    
    //링크파일 업로드폴더
    fs.mkdirSync(`${UPLOAD_PATH}/${data.bo_table}`, { recursive: true });
    fs.chmodSync(`${UPLOAD_PATH}/${data.bo_table}`, 0o707);
    
    return insertDone;

  },
  //게시글 수정
  edit: async function (req) {
    try {
      // //관리자등급 확인
      // if (!isGrant(req, LV.SUPER)) {
      //   throw new Error("수정권한이 없습니다.");
      // }
      const {bo_table} = req.query;
      const data = req.body;
      delete data.bo_table;
      data.bo_category = JSON.stringify(data.bo_category);
      data.bo_sort = JSON.stringify(data.bo_sort);
      data.wr_fields = JSON.stringify(data.wr_fields);
      delete data.bo_create_at;
      // 카테고리 추가삭제 및 수정있을시 기존것 확인 그리고 다른것 추출해서 write_ 파일 지울것
      const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`, null, {bo_table}, ["bo_category"]);

      const [[originCategories]] = await db.execute(query, values);
      const arr = JSON.parse(originCategories.bo_category); // 원본

      if (arr.length > 0) {
        const compare = JSON.parse(data.bo_category);
        const compareArr = [];
        for(com in compare){
          compareArr.push(compare[com].name)
        }
        const delArr = arr.filter((c) => {
          return !compareArr.includes(c.name)
        }); //1가지 카테고리가 있으면 이카테고리로 몇개 글이 있는지 파악하고 그만큼 포문돌려 지워줘야한다.
        for (let i = 0; i < delArr?.length; i++) {
          const {query,values} = await sqlHelper.selectLimit(
            `${TABLE.WRITE}${bo_table}`,null,{ wr_category: delArr[i].name },["COUNT(*) AS cnt"]
          ); // 해당 wr_id 가져오기
          const [[{ cnt }]] = await db.execute(query,values);
          let delCheck = 0;
          if (cnt > 0) {
            //delArr 순차적으로 데이터 지워준다
            for (let j = 0; j < cnt; j++) {
              const {query,values} = await sqlHelper.selectLimit(
                `${TABLE.WRITE}${bo_table}`,null,{ wr_category: delArr[i].name },["wr_id"]
              ); // 해당 wr_id 가져오기
              const [[{ wr_id }]] = await db.execute(query,values);

              if (wr_id) {
                delCheck += await boardController.delBoardRow(`${TABLE.WRITE}${bo_table}`,wr_id);
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
      const edit =  await sqlHelper.edit(`${TABLE.WRITE}${table}`, payload, { bo_table });
      const [editDone] = await db.execute(edit.query, edit.values);
      return editDone;
  
    } catch (e) {}

  },
  //게시글 삭제
  del: async function (req) {
    // adm_board use=0 wr_board 불러올때는 사용가능한 adm_board 불러오기
    const {bo_table} = req.body
    const payload = {
      bo_use: 0,
      bo_update_at: moment().format("YYYY-MM-DD HH:mm:ss"), //시간새로
      bo_ip: ip(),
    };
    const { query, values } = await sqlHelper.edit(`${TABLE.WRITE}${table}`, payload, {bo_table});
    const [delDone] = await db.execute(query, values);
    return delDone;
  },
  //전체목록수
  listCount: async function () {
    const query = await sqlHelper.selectSimpleCount(`${TABLE.WRITE}${table}`);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록
  list: async function (req) {
    const { table } = req.params;
    const options = {...req.query};
    const { query,values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`, options);
    console.log(query,values);
    const [rows] = await db.execute(query,values);
    return rows;
  },
  //where절 목록 
  listByWhere: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //비멤버 토큰체크 
  tokenCheck: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //최근 게시물 가져오기 
  latest: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //게시물 관련 목록을 가져옴 // 이전글/다음글/관련글
  listInfo: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //조회수 증가 
  viewUp: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //댓글목록
  commentList: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //댓글추가
  commentAdd: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //댓글수정
  commentEdit: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //댓글삭제
  commentDel: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //답글추가 
  replyAdd: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //답글수정
  replyEdit: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //답글삭제 
  replyDel: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //파일다운로드 
  download: async function (req) {
    const cols ={ ...req.body} ;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
};
module.exports = boardController;
