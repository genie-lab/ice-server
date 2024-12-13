const db = require("../../plugins/mysql");
const { TABLE } = require("../../util/TABLE");
const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { LV, isGrant } = require("../../util/level");
const fs = require("fs");
const path = require("path");
const { generatePassword } = require("../../plugins/jwt");
const searchController = require('./searchController')
const { getFlag } = require("./goodController");
const getSummary = require("../../util/getSummary");
const getImage = require("../../util/getImage");
const { getIp, isEmpty } = require('../../util/lib')


const boardController = {

  //테이블 설정정보가져오기 //내부용
  tableConfig : async(table)=>{
    const cols ={ bo_table : table, bo_use : 1} ;
    const { query, values } = await sqlHelper.selectLimit(TABLE.BOARD,null,cols);
    const [[rows]] = await db.execute(query, values);
    return rows
  },

  //전체 카테고리들 get
  menuList: async function (req) {
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,null,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //게시글 추가
  add: async (req) => {
    const { table } = req.params;
    const config = await boardController.tableConfig(table); //설정정보가져오기
    if(isEmpty(config)){
      throw new Error("사용중지된 게시판입니다") 
    }
    console.log('isGrant(req, config.bo_write_level);.', config.bo_write_level)
    console.log('isGrant(req, config.bo_write_level);',isGrant(req, config.bo_write_level))
    const grant = isGrant(req, config.bo_write_level);
    if (!grant) {
      throw new Error("작성 권한이 없습니다.")
    }
    const row = req.body;
    //디비 안들어가는 것 지우기
    delete row.wrFiles;
    // 컬럼추가
    row.wr_summary = getSummary(row.wr_content, 250);

    //검색태그
    const wrTags = row.wrTags;
    delete row.wrTags;

    //계층형 그룹
    //계층형 그룹
    let sql;
    if (row.wr_parent == 0) {
      // 새글
      sql = `SELECT max(wr_grp) AS wr_grp FROM ${TABLE.WRITE}${table}`; // 글쓰기 그룹을 가져옴
      let wr_grp = (await db.execute(sql))[0][0].wr_grp; //
      row.wr_grp = wr_grp ? wr_grp + 1 : 1; // 그룹 null이면 1
      row.wr_order = 0; // 순서
      row.wr_dep = 0; // 깊이

    } else {
      // 답글
      sql = `SELECT wr_grp, wr_order, wr_dep FROM ${TABLE.WRITE}${table} WHERE wr_id=${row.wr_parent}`;
      const [parent] = (await db.execute(sql))[0];
      row.wr_grp = parent.wr_grp;
      row.wr_order = parent.wr_order + 1;
      row.wr_dep = parent.wr_dep + 1;
      const uSql = `UPDATE ${TABLE.WRITE}${table} SET wr_order = wr_order + 1
					WHERE wr_reply=0 AND wr_grp=${parent.wr_grp} AND wr_order >= ${row.wr_order}`;
      await db.execute(uSql);
    }

    //password 암호화
    if (row.wr_password) {
      row.wr_password = await generatePassword(row.wr_password);
    }

    const at = moment().format("YYYY-MM-DD HH:mm:ss");

    const ip = getIp(req);

    const payload = {
      ...row,
      wr_create_at: at,
      wr_update_at: at,
      wr_ip: ip,
    };

    const { query, values } = await sqlHelper.insert(`${TABLE.WRITE}${table}`, payload);
    const [insertDone] = await db.execute(query, values);
    const wr_id = insertDone.insertId; // auto increment id

    //태그등록
    if(wrTags?.length>0){
      await searchController.tagAdd(table, wr_id, wrTags);
    }

    //파일추가
    let wr_content = row.wr_content;
    const files = req?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        files[i].originalname = Buffer.from(files[i].originalname, "ascii").toString("utf8");
        files[i].fieldname = Buffer.from(files[i].fieldname, "ascii").toString("utf8");
        // url만들기
        const { destination, filename } = files[i];
        const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;

        if (insertDone?.affectedRows == 1) {
          //files에 저장하기
          const filePayload = {
            f_field: `${TABLE.WRITE}${table}`,
            f_fieldname: insertDone.insertId,
            f_originalname: files[i].originalname,
            f_encoding: files[i].encoding,
            f_mimetype: files[i].mimetype,
            f_destination: files[i].destination,
            f_filename: files[i].filename,
            f_path: files[i].path,
            f_size: files[i].size,
          };
          const { query, values } = await sqlHelper.insert(
            TABLE.FILES,
            filePayload
          );
          await db.execute(query, values);
        }

        //blob링크를 서버쪽링크로 교체
        const fieldname = files[i].fieldname
        const checkname = fieldname.split('%')[0];
        //첨부파일 아닌 본문에 있을때만 교체
        if (url && wr_content.indexOf(checkname) > -1) {
          wr_content = wr_content.replace(`${checkname}`,url);
        }

      }
      //이미지 링크교체된것 최종 게시판테이블 업데이트
      const updateQuery = await sqlHelper.edit(`${TABLE.WRITE}${table}`, {wr_content}, { wr_id });
      await db.execute(updateQuery.query, updateQuery.values);
    } 
    // 게시물 아이디
    return wr_id;
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
    const { table } = req.params;
    const config = await boardController.tableConfig(table); //설정정보가져오기
    if(isEmpty(config)){
      throw new Error("사용중지된 게시판입니다") 
    }
    const query = await sqlHelper.selectSimpleCount(`${TABLE.WRITE}${table}`);
    const [[{ rowsCount }]] = await db.execute(query);
    return rowsCount;
  },
  //페이지 목록
  list: async function (req) {
    const { table } = req.params;
    const options = {...req.query};
    // console.log('options>>>>>>>>>',options);
    // const options = { rowsPerPage: '5', page: '0', sortBy: 'wr_update_at', type: 'desc' }
    //사용중인 테이블인지 확인 

    const { query,values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`, options);
    console.log(query,values);
    const [rows] = await db.execute(query,values);
    return rows;
  },
  //where절 목록 
  listByWhere: async function (req) {
    const bo_table = req.params.table;

    const table = `${TABLE.VIEW}${req.params.table}`;
    const config = await boardController.tableConfig(bo_table)
    const grant = isGrant(req, config.bo_list_level);

    const wr_id = req.params.id;
    const member = req.user;

    if (!grant) { return res.json({ err: "목록읽기 권한이 없습니다." }); }
    
    const { query, values } = await sqlHelper.selectLimit(table, null, {wr_id});
    const [[item]] = await db.execute(query, values);
    const row = item;
    if (!item) { return res.json({ err: "게시물이 없습니다" }) }

    await boardController.addFiles(bo_table, row);// file관련 item.wrImgs 본문내용, item.wrFiles 첨부파일
    await boardController.addGoodFlag(bo_table, row, member);// good
    await boardController.addTags(bo_table, row);// tags
    delete row.wr_password; //비번삭제
    return row;

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
    const {table, limit} =req.body;
    const config = await boardController.tableConfig(table); //설정정보가져오기
    if(isEmpty(config)){
      throw new Error("사용중지된 게시판입니다") 
    }
    const sql = sqlHelper.selectLimit(table, null, { wr_reply: 0 }); // 부모글
    const manyReplys = sql.query + ` ORDER BY replys DESC, wr_update_at DESC LIMIT ${limit}`; // 댓글 수
    const manyViews = sql.query + ` ORDER BY wr_view DESC, wr_update_at DESC LIMIT ${limit}`; // 본 수
    const manyGoods = sql.query + ` ORDER BY good DESC, wr_update_at DESC LIMIT ${limit}`; // 좋아요
    sql.query += ` ORDER BY wr_update_at DESC LIMIT ${limit}`; // 부모글

    const [rows] = await db.execute(sql.query, sql.values); // 부모글
    const [replys] = await db.execute(manyReplys, sql.values); // 댓글 수
    const [views] = await db.execute(manyViews, sql.values); // 본 수
    const [goods] = await db.execute(manyGoods, sql.values); // 좋아요

    // 썸네일 이미지 연결 - 게시물에 연관 파일을 붙인다.
    for (const item in rows) {
      const row = item;
      await boardController.addFiles(table, row);
      await searchController.addTags(table, row); // tags
      row.thumb = getImage(config, row);
    }
    // 댓글 게시물에 연관파일을 붙인다
    for (const item in replys) {
      const row = item;
      await boardController.addFiles(table, row);
      await searchController.addTags(table, row); // tags
      row.thumb = getImage(config, row);
    }
    return { title:config.bo_title, rows, replys, views, goods }; //게시판이름, 부모글5,답글5,조회수5,좋아요5
  },
  //최근 게시물 가져오기에 파일 붙이기 //내부용
  addFiles : async function(table, row){
    //파일테이블내역 불러오기
    cols={
      f_field:table,
      f_fieldname:row.wr_id,
    }
    funcs=['f_id','f_originalname','f_encoding','f_mimetype','f_destination','f_filename','f_path','f_size']
    const {query, values} = await sqlHelper.selectLimit(TABLE.FILES, null, cols, funcs);
    const [files] = await db.execute(query, values);
    row.wrImgs = []; //본문에 첨부된 이미지
    row.wrFiles = []; //첨부파일
    // console.log('files?.length',files?.length);
    if(files?.length<=0) return 

    for (const file in files) {
      const src = file.f_originalname; //파일이름
      const idx = src.lastindexOf('.');
      const filename =src.substring(0,idx+1)
      if (row.wr_content.indexOf(filename) < 0) {
        //없으면 첨부파일
        file.remove = false;
        row.wrFiles.push(file);
      } else {
        row.wrImgs.push(file);
      }
    }
  },
  //최근게시물에 태그붙이기 //내부용
  addTags: async function (table, row){
    //태그테이블내역 불러오기
    cols={
      bo_tag:table,
      wr_id:row.wr_id,
    }
    funcs=['bo_tag']
    const {query, values} = await sqlHelper.selectLimit(TABLE.BOARD_TAGS, null, cols,funcs);
    const [tags] = await db.execute(query, values);
    row.wrTags=[]
    for (const tag of tags){
      row.wrTags.push(tag.bo_tag)
    }
  },
  //좋아요 붙이기 //내부용
  addGoodFlag: async function (table,row,member){
    if(member){
      row.goodFlag = await getFlag(table,row,member) //goodController에서
    }else{ 
      row.goodFlag = 0
    }
  },
  //게시물 관련 목록을 가져옴 // 이전글/다음글/관련글
  listInfo: async function (req) {
    const bo_table = req.params.table;
    const table = `${TABLE.VIEW}${req.params.table}`;
    const wr_id = req.params.id;
    const member = req.user[0];
    const conf = await boardController.tableConfig(bo_table)
    const [[config]] = await db.execute(conf.query, conf.values);
    // const grant = isGrant(req, config.bo_list_level);
    // if (!grant) { return res.json({ err: "목록읽기 권한이 없습니다." }); }


    // const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,cols);
    // const [rows] = await db.execute(query, values);
    // return rows;
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
