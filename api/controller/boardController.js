const db = require("../../plugins/mysql");
const { TABLE } = require("../../util/TABLE");
const STATUS = require("../../util/STATUS");

const sqlHelper = require("../../util/sqlHelper");
const qs = require("qs");
const { ip, ipv6, mac } = require("address");
const moment = require("../../util/moment");
const { LV, isGrant } = require("../../util/level");
const fs = require("fs");
const path = require("path");
const jwt = require("../../plugins/jwt");
const searchController = require("./searchController");
const { getFlag } = require("./goodController");
const getSummary = require("../../util/getSummary");
const getImage = require("../../util/getImage");
const { getIp, isEmpty, resData } = require("../../util/lib");
const randToken = require("rand-token");

const boardController = {
  //테이블 설정정보가져오기 //내부용*
  getConfig: async (bo_table) => {
    const cols = { bo_table: bo_table, bo_use: 1 };
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD,
      null,
      cols
    );
    const [[row]] = await db.execute(query, values);
    if (!row) {
      const data = { err: `${bo_table} 게시판이 없습니다` };
      return resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data //data
      );
    }
    try {
      row.bo_category = JSON.parse(row.bo_category);
      row.wr_fields = JSON.parse(row.wr_fields);
      row.bo_sort = JSON.parse(row.bo_sort);
    } catch (e) {}

    return row;
  },
  //전체 카테고리들 get*
  menuList: async function (config, bo_table) {
    const table = `${TABLE.WRITE}${bo_table}`;
    const options = {};
    options.sortBy = [];
    options.type = [];
    for (const sort of config.bo_sort) {
      options.sortBy.push(sort.by);
      options.type.push(sort.desc);
    }
    const cols = ["wr_id", "wr_parent", "wr_title", "wr_category"];
    const { query, values } = await sqlHelper.selectLimit(`${TABLE.WRITE}${table}`,options,cols);
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //게시글 추가 - 글쓰기*
  add: async (bo_table, row, req) => {
    console.log('row>>>',row);
    //디비 안들어가는 것 지우기
    delete row.wrFiles;

    //테이블
    const table = `${TABLE.WRITE}${bo_table}`;
    row.wr_summary = getSummary(row.wr_content, 250);

    //검색태그
    const wrTags = row.wrTags;
    delete row.wrTags;

    //계층형 그룹
    let sql;
    if (row.wr_parent == 0) {
      // 새글
      sql = `SELECT max(wr_grp) AS wr_grp FROM ${table}`; // 글쓰기 그룹을 가져옴
      let wr_grp = (await db.execute(sql))[0][0].wr_grp; //
      row.wr_grp = wr_grp ? wr_grp + 1 : 1; // 그룹 null이면 1
      row.wr_order = 0; // 순서
      row.wr_dep = 0; // 깊이
    } else {
      // 답글
      sql = `SELECT wr_grp, wr_order, wr_dep FROM ${table} WHERE wr_id=${row.wr_parent}`;
      const [parent] = (await db.execute(sql))[0];
      row.wr_grp = parent.wr_grp;
      row.wr_order = parent.wr_order + 1;
      row.wr_dep = parent.wr_dep + 1;
      const uSql = `UPDATE ${table} SET wr_order = wr_order + 1
					WHERE wr_reply=0 AND wr_grp=${parent.wr_grp} AND wr_order >= ${row.wr_order}`;
      await db.execute(uSql);
    }

    //password 암호화
    if (row.wr_password) {
      row.wr_password = await jwt.generatePassword(row.wr_password);
    }

    const at = moment().format("YYYY-MM-DD HH:mm:ss");

    const ip = getIp(req);

    const payload = {
      ...row,
      wr_create_at: at,
      wr_update_at: at,
      wr_ip: ip,
    };

    const { query, values } = await sqlHelper.insert(`${table}`,payload);
    const [insertDone] = await db.execute(query, values);
    const wr_id = insertDone.insertId; // auto increment id

    //태그등록
    if (wrTags?.length > 0) {
      await searchController.tagAdd(bo_table, wr_id, wrTags);
    }

    //파일추가
    let wr_content = row.wr_content;
    const files = req?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        files[i].originalname = Buffer.from(files[i].originalname,"ascii").toString("utf8");
        files[i].fieldname = Buffer.from(files[i].fieldname, "ascii").toString("utf8");
        // url만들기
        const { destination, filename } = files[i];
        const url = `${req?.protocol}://${req?.headers?.host}/${destination}${filename}`;

        if (insertDone?.affectedRows == 1) {
          //files에 저장하기
          const filePayload = {
            f_field: `${table}`,
            f_fieldname: insertDone.insertId,
            f_originalname: files[i].originalname,
            f_encoding: files[i].encoding,
            f_mimetype: files[i].mimetype,
            f_destination: files[i].destination,
            f_filename: files[i].filename,
            f_path: files[i].path,
            f_size: files[i].size,
          };
          const { query, values } = await sqlHelper.insert(TABLE.FILES,filePayload);
          await db.execute(query, values);
        }

        //blob링크를 서버쪽링크로 교체
        const fieldname = files[i].fieldname;
        const checkname = fieldname.split("%")[0];
        //첨부파일 아닌 본문에 있을때만 교체
        if (url && wr_content.indexOf(checkname) > -1) {
          wr_content = wr_content.replace(`${checkname}`, url);
        }
      }
      //이미지 링크교체된것 최종 게시판테이블 업데이트
      const updateQuery = await sqlHelper.edit(`${table}`,{ wr_content },{ wr_id });
      await db.execute(updateQuery.query, updateQuery.values);
    }
    // 게시물 아이디
    return wr_id;
  },
  //게시글 수정*
  edit: async (bo_table, row, req) => {

    const table = `${TABLE.WRITE}${bo_table}`;
    let { wr_id } = row;

    // 콘텐츠 첨부파일 삭제 처리
    const wrFiles = JSON.parse(row.wrFiles); // 배열 파스
    delete row.wrFiles;

    //첨부파일 wrFiles 삭제하고 DB 업데이트
    if (wrFiles.length > 0) {
      for (const wrFile of wrFiles) {
        if (wrFile.remove) {
          await boardController.removeFile(bo_table, wrFile);
        }
      }
    }


    //예전 본문 삽입이미지 삭제하고 DB 업데이트
    const wrImgs = JSON.parse(row.wrImgs);
    delete row.wrImgs;
    if (wrImgs.length > 0) {
      for (let i = 0; i < wrImgs.length; i++) {
        //새로업데이트된 내용에 포함되지않았을때  //"bf_src":"IJ4z1717671828775.jpg"
        if (row.wr_content.indexOf(wrImgs[i].f_filename) <= -1) {
          //파일지우기만함
          await boardController.removeFile(bo_table, wrImgs[i]);
        }
      }
    }


    //파일추가
    let wr_content = row.wr_content;
    const files = req?.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        files[i].originalname = Buffer.from(
          files[i].originalname,
          "ascii"
        ).toString("utf8");
        files[i].fieldname = Buffer.from(files[i].fieldname, "ascii").toString(
          "utf8"
        );
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
        const fieldname = files[i].fieldname;
        const checkname = fieldname.split("%")[0];
        //첨부파일 아닌 본문에 있을때만 교체
        if (url && wr_content.indexOf(checkname) > -1) {
          wr_content = wr_content.replace(`${checkname}`, url);
        }
      }
      //이미지 링크교체된것 최종 게시판테이블 업데이트
      const updateQuery = await sqlHelper.edit(
        table,
        { wr_content },
        { wr_id }
      );
      await db.execute(updateQuery.query, updateQuery.values);
    }
    delete row.wr_create_at;
    delete row.wr_password;
    row.wr_update_at = moment().format("YYYY-MM-DD HH:mm:ss");
    row.wr_summary = getSummary(row.wr_content, 250);

    /* VIEW 필드 삭제 */
    delete row.good;
    delete row.bad;
    delete row.replys;
    delete row.goodFlag;

    // 태그 등록
    const wrTags = row.wrTags;
    delete row.wrTags;

    //기존 글번호 태그 모두지우고 새로 인서트
    await searchController.tagAdd(bo_table, wr_id, wrTags);

    //내용 수정
    //이미지 링크교체된것 최종 게시판테이블 업데이트
    row.wr_content = wr_content;

    const sql = await sqlHelper.edit(table, row, { wr_id });
    const [rows] = await db.execute(sql.query, sql.values);

    if (rows.affectedRows == 1) {
      return wr_id;
    } else {
      return resData(
        STATUS.E400.result, //status
        STATUS.E400.resultDesc + " 업데이트 실패", //message
        moment().format("YYYY-MM-DD HH:mm:ss")
      );
    }
  },
  //수정시 게시글 파일삭제 //내부용
  removeFile: async (table, file) => {
    const { f_id, f_filename } = file;
    const filePath = `${UPLOAD_PATH}/${table}/${f_filename}`; //upload/test/ahSx1733907080383.jpg
    const cachePath = `${UPLOAD_PATH}/${table}/.cache`; // 섬네일

    // 파일삭제
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // 지우기
    }
    // 섬네일 삭제
    if (fs.existsSync(cachePath)) {
      const cacheDir = fs.readdirSync(cachePath);
      for (const p of cacheDir) {
        if (p.startsWith(f_filename)) {
          try {
            fs.unlinkSync(`${cachePath}/${p}`);
          } catch (e) {
            console.log(`delete ${p} error`, e.message);
          }
        }
      }
    }
    // db 삭제
    const sql = sqlHelper.del(TABLE.FILES, { f_id });
    await db.execute(sql.query, sql.values);
  },
  //수정시 게시글 삭제 //내부용
  removeItem: async (bo_table, wr_id,wr_grp,ip) => {
    const table = `${TABLE.WRITE}${bo_table}`;
    // tag삭제
    await searchController.tagDel(bo_table, wr_id);
    // 삭제할 로우의 관련파일 가져오기
    const { query, values } = await sqlHelper.selectLimit(TABLE.FILES,null,
      {f_field: bo_table, f_fieldname: wr_id,},
      ["f_id", "f_filename"]
    );

    const [files] = await db.execute(query, values);
    for (const file of files) {
      await this.removeFile(bo_table, file);
    }

    // 게시물이 본문글이면 댓글도 삭제
    const sqlReply = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${bo_table}`,null,{ wr_id },["wr_reply"]);

    const [[replRows]] = await db.execute(sqlReply.query, sqlReply.values);

    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    let delCnt=0;
    // 게시물이 본문글이면 댓글도 삭제
    if (replRows?.wr_reply == 0) {
      const payload = { wr_use: 0, wr_update_at: at, wr_ip: ip };
      // 댓글삭제
      const replDel = await sqlHelper.edit(`${TABLE.WRITE}${bo_table}`, payload, { wr_reply: wr_id });
      const [parentDel]=await db.execute(replDel.query, replDel.values);
      delCnt = parentDel.affectedRows

      // 답글(그룹)삭제
      const grpDel = await sqlHelper.edit(`${TABLE.WRITE}${bo_table}`, payload, { wr_grp });
      const [parentGrpDel]=await db.execute(grpDel.query, grpDel.values);
      delCnt = parentGrpDel.affectedRows
    }
    // 자기자신(게시물)도 삭제
    const payload = { wr_use: 0, wr_update_at: at, wr_ip: ip };
    const rows = await sqlHelper.edit(`${TABLE.WRITE}${bo_table}`, payload, {wr_id});

    const [childDel] = await db.execute(rows.query, rows.values);
    delCnt = childDel.affectedRows
    return delCnt;
  },
  //수정시 게시글 삭제 //내부용
  removeComment: async (bo_table, wr_id) => {
    // 게시물 댓글 삭제
      const rows = await sqlHelper.del(`${TABLE.WRITE}${bo_table}`,{wr_id});
      const [childDel] = await db.execute(rows.query, rows.values);
      const delCnt = childDel.affectedRows
    return delCnt;
  },
  //게시글 삭제*
  del: async (bo_table, id, grp, member,ip) => {

    const wr_id = Number(id)
    const wr_grp = Number(grp)
    const table = `${TABLE.WRITE}${bo_table}`;
    let delCnt = 0;
    // 자식글이 있는지 확인
    const ch = await sqlHelper.selectLimit(table, null, { wr_reply: wr_id },["wr_id"]);
    const [children] = await db.execute(ch.query,ch.values)

    // 최고 관리자 이면 모두 삭제함
    if (member && member?.mb_level >= LV.SUPER) {
      for (const child of children) {
        delCnt += await boardController.del(bo_table, child.wr_id,child.wr_grp, member,ip);
      }
      delCnt += await boardController.removeItem(bo_table, wr_id,wr_grp,ip);
    } else {
      if (children?.length == 0) {

        // 답글 유무,
        const replys = await sqlHelper.selectLimit(table,null,{ wr_reply: wr_id },["wr_id"]);

        if (replys.length == 0) {
          // 댓글이 없으면
          delCnt += await boardController.removeItem(bo_table, wr_id,wr_grp,ip);
        } else {
          return resData(
            STATUS.E200.result, //status
            STATUS.E200.resultDesc + " 댓글이 있어 삭제할 수 없습니다.", //message
            moment().format("YYYY-MM-DD HH:mm:ss")
          );
        }
      } else {
        return resData(
          STATUS.E200.result, //status
          STATUS.E200.resultDesc + "답글이 있어 삭제할 수 없습니다.", //message
          moment().format("YYYY-MM-DD HH:mm:ss")
        );
      }
    }
    return delCnt;
  },
  //전체목록수
  listCount: async function (req) {
    const { table } = req.params;
    const config = await boardController.getConfig(table); //설정정보가져오기

    if (isEmpty(config)) {
      throw new Error("사용중지된 게시판입니다");
    }
    const cols = {
      wr_use: 1,
    };

    const { query, values } = await sqlHelper.selectSimpleCount(`${TABLE.WRITE}${table}`,cols);
    const [[ {rowsCount} ]] = await db.execute(query, values);

    return rowsCount;
  },
  //특정조건 전체목록수
  listByWhereCount: async function (req) {
    const { table, id } = req.params;
    const config = await boardController.getConfig(table); //설정정보가져오기
    if (isEmpty(config)) {
      throw new Error("사용중지된 게시판입니다");
    }
    const { query, values } = await sqlHelper.selectSimpleCount(
      `${TABLE.WRITE}${table}`,
      null,
      { wr_name: id }
    );
    const [[{ rowsCount }]] = await db.execute(query, values);
    return rowsCount;
  },
  //페이지 목록*
  list: async function (config, bo_table, options, member,host) {

    if (!bo_table) {
      const data = { err: "테이블이 지정되지 않았습니다." };
      return resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data //data
      );
    }
    const table = `${TABLE.VIEW}${bo_table}`;

    // search
    // const options = req.query;
    const wr_name = options?.writer ? { wr_name: options?.writer } : null;
    const cols = {
      wr_name,
      wr_use: 1,
      wr_reply:0,
    };
    cols["wr_name"] == null ? delete cols.wr_name : cols["wr_name"];
    delete options?.writer;

    if (options?.search) {
      const colnameSql = await sqlHelper.colnames(table);
      const [colnames] = await db.execute(colnameSql);
      const searchCols = colnames.map((c) => {
        return c.COLUMN_NAME;
      });
      const { query, values } = await sqlHelper.selectLimit(table,options,cols,null,searchCols);
      const [rows] = await db.execute(query, values);


      // 썸네일 이미지 연결 - 게시물에 연관 파일을 붙인다.
      for (const row of rows) {

        await boardController.addFiles(bo_table, row);
        await boardController.addTags(bo_table, row); // tags
        await boardController.addGoodFlag(bo_table, row, member);
        row.thumb = getImage(config, row, host);
      }
      const cnt = await sqlHelper.selectSimpleCount(table, options, cols)
      const [[{ rowsCount }]] = await db.execute(cnt.query,cnt.values);

      const data = {rowsCount,rows};
      return {
        status: STATUS.S200.result, //status
        message: STATUS.S200.resultDesc, //message
        resDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        data, //data
      };
    } else {
      const { query, values } = await sqlHelper.selectLimit(table,options,cols);
      const [rows] = await db.execute(query, values);

      for (const row of rows) {
        await boardController.addFiles(bo_table, row);
        await boardController.addTags(bo_table, row); // tags
        await boardController.addGoodFlag(bo_table, row, member);
        row.thumb = getImage(config, row,host);
      }

      const cnt = await sqlHelper.selectSimpleCount(table, null, cols)
      // const countQuery = `SELECT COUNT(*) AS count FROM ${table} ${where}`;

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
  //게시물 가져오기*
  getItem: async function (bo_table, id, member,host) {
    const table = `${TABLE.VIEW}${bo_table}`;
    const wr_id = Number(id);
    const sql = await sqlHelper.selectLimit(table, null, { wr_id });
    const [[rows]] = await db.execute(sql.query, sql.values);
    const row = rows;
    if (!row) {
      return resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc + " 게시물이 없습니다", //message
        moment().format("YYYY-MM-DD HH:mm:ss")
      );
    }

    await boardController.addFiles(bo_table, row); // file관련 item.wrImgs 본문내용, item.wrFiles 첨부파일
    await boardController.addGoodFlag(bo_table, row, member); // good
    await boardController.addTags(bo_table, row); // tags

    delete row.wr_password; //비번삭제
    return row;
  },

  //수정권한 검사*
  checkItem: async function (bo_table, wr_id, password) {
    const wr_password = await generatePassword(password);
    const table = `${TABLE.WRITE}${bo_table}`;
    const [[{cnt}]] = await sqlHelper.selectLimit(table, null, { wr_id, wr_password }, [
      "COUNT(*) as cnt",
    ]);
    return cnt;
  },

  //최근 게시물 가져오기*
  latest: async function (config, bo_table, limit,host) {
    const table = `${TABLE.VIEW}${bo_table}`;
    const sql = `select * from ${table} WHERE wr_reply=0 and wr_use=1 ` // 부모글
    const manyReplys = sql + ` ORDER BY replys DESC, wr_update_at DESC LIMIT ${limit}`; // 답글 또는 부모글
    const manyViews = sql + ` ORDER BY wr_view DESC, wr_update_at DESC LIMIT ${limit}`; // 본 수
    const manyGoods = sql + ` ORDER BY good DESC, wr_update_at DESC LIMIT ${limit}`; // 좋아요
    const [replys] = await db.execute(manyReplys); // 부모글또는 답글 wr_reply==0 수
    const [views] = await db.execute(manyViews); // 본 수
    const [goods] = await db.execute(manyGoods); // 좋아요

    // 썸네일 이미지 연결 - 게시물에 연관 파일을 붙인다.
    for (const row of replys) {
      await boardController.addFiles(bo_table, row);
      await boardController.addTags(bo_table, row); // tags
      row.thumb = getImage(config, row, host);
    }

    for (const row of views) {
      await boardController.addFiles(bo_table, row);
      await boardController.addTags(bo_table, row); // tags
      row.thumb = getImage(config, row, host);
    }

    for (const row of goods) {
      await boardController.addFiles(bo_table, row);
      await boardController.addTags(bo_table, row); // tags
      row.thumb = getImage(config, row, host);
    }
    return {table:bo_table,replys,views,goods}; //게시판이름, 부모 또는 답글5,조회수5,좋아요5
  },

  //최근 게시물 가져오기에 파일 붙이기 //내부용*
  addFiles: async function (table, row) {
    //파일테이블내역 불러오기
    cols = {f_field: `${TABLE.WRITE}${table}`,f_fieldname: row.wr_id};
    funcs = ["f_id","f_originalname","f_encoding","f_mimetype","f_destination","f_filename","f_path","f_size",];
    const { query, values } = await sqlHelper.selectLimit(TABLE.FILES,null,cols,funcs);
    const [files] = await db.execute(query, values);

    row.wrImgs = []; //본문에 첨부된 이미지
    row.wrFiles = []; //첨부파일

    if (files?.length <= 0) return;

    for (const file of files) {
      const src = file.f_originalname; //파일이름
      const idx = src.lastIndexOf(".");
      const filename = src.substring(0, idx + 1);

      if (row.wr_content.indexOf(filename) < 0) {
        //없으면 첨부파일
        file.remove = false;
        row.wrFiles.push(file);
      } else {
        row.wrImgs.push(file);
      }
    }
  },
  //최근게시물에 태그붙이기 //내부용*
  addTags: async function (table, row) {
    //태그테이블내역 불러오기
    cols = {
      bo_table: table,
      wr_id: Number(row.wr_id),
    };
    funcs = ["bo_tag"];
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD_TAGS,
      null,
      cols,
      funcs
    );

    const [tags] = await db.execute(query, values);

    row.wrTags = [];
    for (const tag of tags) {
      row.wrTags.push(tag.bo_tag);
    }

  },
  //좋아요 붙이기 //내부용*
  addGoodFlag: async function (table, row, member = null) {
    if (member) {
      row.goodFlag = await getFlag(table, row.wr_id, member.mb_id); //goodController에서
    } else {
      row.goodFlag = 0;
    }
  },
  //게시물 관련 목록을 가져옴 // 이전글/다음글/관련글*
  getInfo: async function (bo_table, wr_grp) {
    const table = `${TABLE.WRITE}${bo_table}`;
    const prev = await sqlHelper.selectLimit(table,null,{wr_reply: 0, wr_use:1, wr_grp: wr_grp - 1});
    const [[prevResult]] = await db.execute(prev.query, prev.values);
    const next = await sqlHelper.selectLimit(table,null,{wr_reply: 0, wr_use:1, wr_grp: wr_grp + 1});
    const [[nextResult]] = await db.execute(next.query, next.values);
    const prevNextInfo = {
      prev: prevResult ? prevResult : null,
      next: nextResult ? nextResult : null,
    };
    return prevNextInfo;
  },
  //작성자글 모아보기*
  getInfoGrp: async function (config,bo_table,wr_grp,req) {
    const { page } = req.query;
    const table = `${TABLE.WRITE}${bo_table}`;
    const options={ ...req.query}
    let sortBy=[];
    let type=[];
    for (const sort of config.bo_sort) {
        sortBy.push(sort.by)
        const desc  = Number(sort.desc)==0 ? 'desc' : 'asc';
        type.push(desc)
    }
    options.sortBy = sortBy;
    options.type = type;
    options.page = page-1;
    const cols={wr_reply:0, wr_grp:Number(wr_grp)}
    const {query,values} = await sqlHelper.selectLimit(table,options,cols);
    const [info] = await db.execute(query,values);
    const grpCnt = await sqlHelper.selectSimpleCount(table,null,cols)
    const [[{rowsCount}]] = await db.execute(grpCnt.query,grpCnt.values)
    const groupInfo = {
      groupInfo:info,
      rowsCount
    };
    return groupInfo;
  },
  //조회수 증가*
  viewUp: async function (bo_table, wr_id) {
    const table = `${TABLE.WRITE}${bo_table}`;
    const sql = `UPDATE ${table} SET wr_view=wr_view+1 WHERE wr_id=${Number(wr_id)}`
    const [rows] = await db.execute(sql);
    return rows;
  },
  //댓글목록 갯수만
  commentListCount: async function (req) {
    const {cols,table} = req.body
    // 전체갯수
    const cnt = await sqlHelper.selectSimpleCount(
      `${TABLE.VIEW}${table}`,null,cols);
    const [[{rowsCount}]] = await db.execute(cnt.query,cnt.values)
    return rowsCount;
  },
  //댓글목록
  //댓글목록가져오기*
  async commentList(bo_table, wr_reply, options, member=null) {

    options.page= Number(options.page)-1
    const cols = {wr_reply,wr_parent:0}
    const table = `${TABLE.VIEW}${bo_table}`;
    const commSql = await sqlHelper.selectLimit(table,options,cols)
    const [rows]=await db.execute(commSql.query,commSql.values)
    const commCount= await sqlHelper.selectSimpleCount(table,null,cols)
    const [[{rowsCount}]] = await db.execute(commCount.query,commCount.values)
    const ids = []; //댓글 아이디모음
    const replys = [];
    for (const row of rows) {
      ids.push(row.wr_id); // 아이디 모음
      await boardController.addGoodFlag(bo_table, row, member);
    }

    //답글모아서 보내기
    for (const id of ids) {
      const {query,values} = await sqlHelper.selectLimit(table,{sortBy:['wr_grp','wr_order'], type:['desc','asc']},{wr_reply,wr_parent:id})
      const [rows]=await db.execute(query,values)

      if (rows?.length > 0) {
        for (const row of rows) {
          await boardController.addGoodFlag(bo_table, row, member);
          //추가
        }
      }
      replys.push(rows);
    }

    const replysArr = replys.filter((el) => {
      return el.length > 0;
    });

    return { rowsCount, rows, replysArr };
  },

  //댓글추가 새글*
  commentAdd: async function (bo_table, data) {
    const table = `${TABLE.WRITE}${bo_table}`; //생성테이블

    let sql;
    if (data.wr_parent == 0) {
      // 새글
      const commParent = await sqlHelper.selectLimit(table,null,{wr_reply:Number(data.wr_reply)},[' max(wr_grp) AS wr_grp '])
      const [[parent]]= await db.execute(commParent.query,commParent.values)
      let wr_grp = parent.wr_grp
      data.wr_grp = wr_grp ? wr_grp + 1 : 1;
      data.wr_order = 0;
      data.wr_dep = 0;
    } else {
      // 답글
      sql = `SELECT wr_grp, wr_order, wr_dep FROM ${table} WHERE wr_id=${data.wr_parent}`;
      const [parent] = (await db.execute(sql))[0];
      data.wr_grp = parent.wr_grp;
      data.wr_order = parent.wr_order + 1;
      data.wr_dep = parent.wr_dep + 1;
      const uSql = `UPDATE ${table} SET wr_order = wr_order + 1
				WHERE wr_reply=${data.wr_reply} AND wr_grp=${parent.wr_grp} AND wr_order >= ${data.wr_order}`;
      await db.execute(uSql);
    }

    data.wr_create_at = moment().format("YYYY-MM-DD HH:mm:ss");
    data.wr_update_at = moment().format("YYYY-MM-DD HH:mm:ss");

    const query =  await sqlHelper.insert(table, data)
    const [rows] = await db.execute(query.query, query.values);
    const wr_id = rows.insertId;

    const comm = await sqlHelper.selectLimit(table,null,{wr_id})
    const [[item]] = await db.execute(comm.query,comm.values)

    return item;

  },
  //댓글수정*
  commentEdit: async function (bo_table, data) {
    const table = `${TABLE.WRITE}${bo_table}`;
    let { wr_id } = data;
    delete data.wr_id;
    delete data.wr_create_at;
    delete data.wr_password;
    /** VIEW 필드 삭제 */
    delete data.good;
    delete data.bad;
    delete data.replys;
    delete data.goodFlag;

    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);

    data.wr_update_at = at
    data.wr_ip=ip

    const { query, values } = await sqlHelper.edit(
      `${TABLE.WRITE}${table}`,
      payload,
      {wr_id}
    );
    const [rows] = await db.execute(query, values);
    if (rows.affectedRows) {
      const data = await sqlHelper.selectLimit(table,null,{wr_id})
      const [[item]] = await db.execute(data.query,data.values)
      return item;
    } else {
      const data = { err: "업데이트 실패" };
      return resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data //data
      );
    }
  },
  //댓글삭제
  commentDel: async function (bo_table,id,member) {
    const wr_id = Number(id)
    const table = `${TABLE.WRITE}${bo_table}`;
    let delCnt = 0;
    // 자식글이 있는지 확인
    const ch = await sqlHelper.selectLimit(table, null, { wr_parent: wr_id },["wr_id"]);
    const [children] = await db.execute(ch.query,ch.values)

    // 최고 관리자 이면 모두 삭제함
    if (member?.mb_level >= LV.SUPER) {
      for (const child of children) {
        delCnt += await boardController.commentDel(bo_table, child.wr_id, member);
      }
      delCnt += await boardController.removeComment(bo_table, wr_id);
    } else {
      if (children?.length == 0) {
        // 답글 유무,
        const replys = await sqlHelper.del(table,{ wr_id });
        const [result] = await db.execute(replys.query,replys.values)
        delCnt = result.affectedRows
      } else {
        return resData(
          STATUS.E200.result, //status
          STATUS.E200.resultDesc + "답글이 있어 삭제할 수 없습니다.", //message
          moment().format("YYYY-MM-DD HH:mm:ss")
        );
      }
    }
    return delCnt
  },

  //대댓글수정
  replyEdit: async function (req) {
    const cols = { ...req.body };
    const { query, values } = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${table}`,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //대댓글삭제
  replyDel: async function (req) {
    const cols = { ...req.body };
    const { query, values } = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${table}`,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //파일다운로드
  download: async function (req) {
    const cols = { ...req.body };
    const { query, values } = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${table}`,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
};
module.exports = boardController;
