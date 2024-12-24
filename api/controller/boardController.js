const db = require("../../plugins/mysql");
const { TABLE } = require("../../util/TABLE");
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
const { getIp, isEmpty } = require("../../util/lib");
const randToken = require("rand-token");

const boardController = {
  //테이블 설정정보가져오기 //내부용
  tableConfig: async (table) => {
    const cols = { bo_table: table, bo_use: 1 };
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.BOARD,
      null,
      cols
    );
    const [[rows]] = await db.execute(query, values);
    return rows;
  },

  //전체 카테고리들 get
  menuList: async function (req) {
    const cols = req.body;
    const { query, values } = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${table}`,
      null,
      cols
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //게시글 추가
  add: async (req) => {
    const { table } = req.params;
    const config = await boardController.tableConfig(table); //설정정보가져오기
    if (isEmpty(config)) {
      throw new Error("사용중지된 게시판입니다");
    }
    const grant = isGrant(req, config.bo_write_level);
    if (!grant) {
      throw new Error("작성 권한이 없습니다.");
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

    const { query, values } = await sqlHelper.insert(
      `${TABLE.WRITE}${table}`,
      payload
    );
    const [insertDone] = await db.execute(query, values);
    const wr_id = insertDone.insertId; // auto increment id

    //태그등록
    if (wrTags?.length > 0) {
      await searchController.tagAdd(table, wr_id, wrTags);
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
        `${TABLE.WRITE}${table}`,
        { wr_content },
        { wr_id }
      );
      await db.execute(updateQuery.query, updateQuery.values);
    }
    // 게시물 아이디
    return wr_id;
  },
  //게시글 수정
  edit: async (req, res) => {
    const param = req.params;
    const row = req.body;

    const table = `${TABLE.WRITE}${param.table}`;
    let { wr_id } = row;
    const { token } = row;

    //비멤버 토큰체크
    let msg = "";
    //req.user가 있을때
    if (typeof member == undefined) {
      //없을때
      if (req.session.checkToken == token) {
        msg = "";
        delete row.token;
      } else {
        msg = "토큰이 없습니다";
      }
      row.mb_id = 0;
    }
    if (!!msg) res.json({ err: msg });

    // 콘텐츠 첨부파일 삭제 처리
    const wrFiles = JSON.parse(row.wrFiles); // 배열 파스
    delete row.wrFiles;

    //첨부파일 wrFiles 삭제하고 DB 업데이트
    if (wrFiles.length > 0) {
      for (const wrFile of wrFiles) {
        if (wrFile.remove) {
          await boardController.removeFile(param.table, wrFile);
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
          await boardController.removeFile(param.table, wrImgs[i]);
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
    await searchController.tagAdd(param?.table, wr_id, wrTags);

    //내용 수정
    //이미지 링크교체된것 최종 게시판테이블 업데이트
    row.wr_content = wr_content;

    const sql = await sqlHelper.edit(table, row, { wr_id });
    const [rows] = await db.execute(sql.query, sql.values);

    if (rows.affectedRows == 1) {
      return wr_id;
    } else {
      return false;
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
  removeRow: async (ip, table, wr_id) => {
    // tag삭제
    await searchController.tagDel(table, wr_id);

    // 삭제할 로우의 관련파일 가져오기
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.FILES,
      null,
      {
        f_field: table,
        f_fieldname: wr_id,
      },
      ["f_id", "f_filename"]
    );

    const [files] = await db.execute(query, values);

    for (const file in files) {
      await this.removeFile(table, file);
    }

    // 게시물이 본문글이면 댓글도 삭제
    const sqlReply = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${table}`,
      null,
      { wr_id },
      ["wr_reply"]
    );
    const [replRows] = await db.execute(sqlReply.query, sqlReply.values);
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    // 댓글이 없을때==============> 삭제
    if (replRows[0]?.wr_reply == 0) {
      const payload = {
        wr_use: 0,
        wr_update_at: at,
        wr_ip: ip,
      };
      const replDel = await sqlHelper.edit(`${TABLE.WRITE}${table}`, payload, {
        wr_reply: wr_id,
      });
      await db.execute(replDel.query, replDel.values);
    }
    const payload = {
      wr_use: 0,
      wr_update_at: at,
      wr_ip: ip,
    };
    const rows = await sqlHelper.edit(`${TABLE.WRITE}${table}`, payload, {
      wr_id,
    });
    const [result] = await db.execute(rows.query, rows.values);

    return result.affectedRows;
  },
  //게시글 삭제
  del: async (req, res) => {
    const wr_id = Number(req.params?.id);
    const { token } = req.body;
    const { table } = req.params;
    const ip = getIp(req);

    const member = req?.user;

    //비멤버 토큰체크
    let msg = "";
    //req.user가 있을때
    if (typeof member == undefined) {
      //없을때
      if (req.session.checkToken == token) {
        msg = "";
        delete row.token;
      } else {
        msg = "토큰이 없습니다";
      }
      row.mb_id = 0;
    }
    if (!!msg) res.json({ err: msg });
    const delCnt = await boardController.delRow(ip, table, wr_id, member);

    return delCnt;
  },
  // 게시글 삭제 재귀함수 //내장용
  delRow: async (ip, table, wr_id, member = null) => {
    let delCnt = 0;
    // 자식글이 있는지 확인
    const sql = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${table}`,
      null,
      { wr_parent: wr_id },
      ["wr_id"]
    );
    const [children] = await db.execute(sql.query, sql.values);

    // 최고 관리자 이면 모두 삭제함
    if (member?.mb_level >= LV.SUPER) {
      for (const child of children) {
        delCnt += await boardController.delRow(ip, table, child.wr_id, member);
      }
      delCnt += await boardController.removeRow(ip, table, wr_id);
    } else {
      if (children?.length == 0) {
        // 답글이 없으면 댓글을 가져온다
        const sql = await sqlHelper.selectLimit(
          `${TABLE.WRITE}${table}`,
          null,
          { wr_reply: wr_id },
          ["wr_id"]
        );
        const [replys] = await db.execute(sql.query, sql.values);
        if (replys.length == 0) {
          // 댓글이 없으면
          delCnt += await boardController.removeRow(ip, table, wr_id);
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
    const config = await boardController.tableConfig(table); //설정정보가져오기

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
    const config = await boardController.tableConfig(table); //설정정보가져오기
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
  //페이지 목록
  list: async function (req) {
    // search
    const options = req.query;
    const table = `${TABLE.WRITE}${req.params.table}`;
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
      const { query, values } = await sqlHelper.selectLimit(
        `${TABLE.VIEW}${req.params.table}`,
        options,
        cols,
        null,
        searchCols
      );
      const [rows] = await db.execute(query, values);
      return rows;
    } else {
      const { query, values } = await sqlHelper.selectLimit(
        `${TABLE.VIEW}${req.params.table}`,
        options,
        cols
      );

      const [rows] = await db.execute(query, values);
      return rows;
    }
  },
  //where절 목록
  listByWhere: async function (req) {
    const bo_table = req.params.table;
    const table = `${TABLE.VIEW}${req.params.table}`;
    const config = await boardController.tableConfig(bo_table);
    const grant = isGrant(req, config.bo_list_level);
    if (!grant) {
      return res.json({ err: "목록읽기 권한이 없습니다." });
    }
    const { cols } = req.body;
    const member = req.user ? req.user : null;
    const { query, values } = await sqlHelper.selectLimit(table, null, cols);
    const [items] = await db.execute(query, values);
    const rows = items;
    if (rows?.length <= 0) {
      return res.json({ err: "게시물이 없습니다" });
    }

    for (const r in rows) {
      await boardController.addFiles(bo_table, rows[r]); // file관련 item.wrImgs 본문내용, item.wrFiles 첨부파일
      await boardController.addGoodFlag(bo_table, rows[r], member); // good
      await boardController.addTags(bo_table, rows[r]); // tags
      delete rows[r].wr_password; //비번삭제
    }
    return rows;
  },
  //비멤버 토큰제공
  tokenCheck: async function (req, res) {
    const { table, id, pw } = req.body;
    //비번바꿔야해
    const wr_password = await jwt.generatePassword(pw);

    const cols = {
      wr_id: id,
      wr_password,
    };
    const { query, values } = await sqlHelper.selectSimpleCount(
      `${TABLE.WRITE}${table}`,
      null,
      cols
    );

    const [[{ rowsCount }]] = await db.execute(query, values);

    if (rowsCount >= 1) {
      // 토큰 만들어주기
      const token = randToken.generate(16);
      req.session["checkToken"] = token;
      return token;
    }
    return "";
  },
  //최근 게시물 가져오기
  latest: async function (req) {
    const { table, limit } = req.body;
    const config = await boardController.tableConfig(table); //설정정보가져오기
    if (isEmpty(config)) {
      throw new Error("사용중지된 게시판입니다");
    }
    const sql = sqlHelper.selectLimit(table, null, { wr_reply: 0 }); // 부모글
    const manyReplys =
      sql.query + ` ORDER BY replys DESC, wr_update_at DESC LIMIT ${limit}`; // 댓글 수
    const manyViews =
      sql.query + ` ORDER BY wr_view DESC, wr_update_at DESC LIMIT ${limit}`; // 본 수
    const manyGoods =
      sql.query + ` ORDER BY good DESC, wr_update_at DESC LIMIT ${limit}`; // 좋아요
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
    return { title: config.bo_title, rows, replys, views, goods }; //게시판이름, 부모글5,답글5,조회수5,좋아요5
  },
  //최근 게시물 가져오기에 파일 붙이기 //내부용
  addFiles: async function (table, row) {
    //파일테이블내역 불러오기
    cols = {
      f_field: table,
      f_fieldname: row.wr_id,
    };
    funcs = [
      "f_id",
      "f_originalname",
      "f_encoding",
      "f_mimetype",
      "f_destination",
      "f_filename",
      "f_path",
      "f_size",
    ];
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.FILES,
      null,
      cols,
      funcs
    );
    const [files] = await db.execute(query, values);
    row.wrImgs = []; //본문에 첨부된 이미지
    row.wrFiles = []; //첨부파일
    if (files?.length <= 0) return;

    for (const file in files) {
      const src = file.f_originalname; //파일이름
      const idx = src.lastindexOf(".");
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
  //최근게시물에 태그붙이기 //내부용
  addTags: async function (table, row) {
    //태그테이블내역 불러오기
    cols = {
      bo_tag: table,
      wr_id: row.wr_id,
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
  //좋아요 붙이기 //내부용
  addGoodFlag: async function (table, row, member = null) {
    if (member) {
      row.goodFlag = await getFlag(table, row, member); //goodController에서
    } else {
      row.goodFlag = 0;
    }
  },
  //게시물 관련 목록을 가져옴 // 이전글/다음글/관련글
  listPrevNext: async function (req) {
    const bo_table = req.params.table;
    const wr_grp = Number(req.params.wrGrp);
    const table = `${TABLE.VIEW}${req.params.table}`;
    const config = await boardController.tableConfig(bo_table);
    const grant = isGrant(req, config.bo_list_level);
    if (!grant) {
      return res.json({ err: "목록읽기 권한이 없습니다." });
    }

    const prev = await sqlHelper.selectLimit(
      table,
      { wr_reply: 0 },
      { wr_grp: wr_grp - 1 }
    );
    const [[prevResult]] = await db.execute(prev.query, prev.values);
    const next = await sqlHelper.selectLimit(
      table,
      { wr_reply: 0 },
      { wr_grp: wr_grp + 1 }
    );
    const [[nextResult]] = await db.execute(next.query, next.values);
    const info = {
      prev: prevResult ? prevResult : null,
      next: nextResult ? nextResult : null,
    };
    return info;
  },
  //작성자글 모아보기
  listByWrName: async function (req) {
    const bo_table = req.params.table;
    const wr_name = req.params.wrName;
    const table = `${TABLE.VIEW}${req.params.table}`;
    const config = await boardController.tableConfig(bo_table);
    const grant = isGrant(req, config.bo_list_level);
    if (!grant) {
      return res.json({ err: "목록읽기 권한이 없습니다." });
    }

    const { query, values } = await sqlHelper.selectLimit(
      table,
      { wr_reply: 0 },
      { wr_name: "tes" }
    );
    const [result] = db.execute(query, values);
    return result;
  },
  //조회수 증가
  viewUp: async function (req) {
    const cols = { ...req.body };
    const { query, values } = await sqlHelper.selectLimit(
      `${TABLE.WRITE}${table}`,
      cols
    );
    const [rows] = await db.execute(query, values);
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
  //댓글목록가져오기
  async commentList(bo_table, option, member) {
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
    const start = (option.page - 1) * option.itemsPerPage;
    // console.log("start", start);
    const end = option.itemsPerPage;
    const sql = `select * from ${table} where wr_reply=${option.wr_reply} and wr_parent = 0
    order by wr_grp desc, wr_order asc limit ${start},${end}`;
    const [items] = await db.execute(sql);
    // console.log("items", items);

    const countQuery = `select count(*) as totalItems  from ${table} where wr_reply=${option.wr_reply} and wr_parent = 0`;
    const [[{ totalItems }]] = await db.execute(countQuery);
    const ids = [];
    const replys = [];
    for (const item of items) {
      console.log("item", item.wr_id);
      ids.push(item.wr_id); // 아이디 모음
      await boardController.addGoodFlag(bo_table, item, member);
    }

    //답글모아서 보내기
    for (let i = 0; i < ids.length; i++) {
      const sql = `select * from view_sts where wr_reply=${option.wr_reply} and wr_parent = ${ids[i]}
    order by wr_grp desc, wr_order asc `;
      const [items] = await db.execute(sql);
      if (items?.length > 0) {
        for (const item of items) {
          await boardController.addGoodFlag(bo_table, item, member);
          //추가
        }
      }
      replys.push(items);
    }
    const replysArr = replys.filter((el) => {
      return el.length > 0;
    });
    return { totalItems, items, replysArr };
  },

  //댓글추가 새글
  commentAdd: async function (req) {
    const {table, form, id} = req.body;

    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);
    let cols={}
    if(form.wr_parent==0){
      const reply=await sqlHelper.selectLimit( `${TABLE.VIEW}${table}`,{
        sortBy: ["wr_order","wr_grp","wr_dep"],
        type: ["desc","desc","desc"],
      },{wr_reply:id})
      const [replRows]= await db.execute(reply.query,reply.values)
      cols={
        ...form,
        wr_grp:replRows[0]?.wr_grp ? replRows[0]?.wr_grp+1 : 1,
        wr_order: 0,
        wr_dep: 0,
        wr_ip:ip,
        wr_create_at:at,
        wr_update_at:at,
      }
      const { query, values } = await sqlHelper.insert(
        `${TABLE.WRITE}${table}`,cols);
      const [insertDone] = await db.execute(query, values);
      if(insertDone.affectedRows==1){
        insertDone.insertId
        const item=await sqlHelper.selectLimit( `${TABLE.VIEW}${table}`,null,{wr_id:insertDone.insertId})//부모내역
        const [[row]]= await db.execute(item.query,item.values)
        return row;
      }
    }else{

      const reply=await sqlHelper.selectLimit( `${TABLE.VIEW}${table}`,null,{wr_id:form.wr_parent},['wr_grp','wr_order','wr_dep'])//부모내역
      const [[parent]]= await db.execute(reply.query,reply.values)
      cols={
        ...form,
        wr_grp:parent.wr_grp,
        wr_order: parent.wr_order + 1,
        wr_dep: parent.wr_dep + 1,
        wr_ip:ip,
        wr_create_at:at,
        wr_update_at:at,
      }

      // order를 1씩 올려줘서 최신글이 1이오겠금
      const uSql = `UPDATE ${TABLE.WRITE}${table} SET wr_order = wr_order + 1
				WHERE wr_reply=${cols.wr_reply} AND wr_grp=${parent.wr_grp} AND wr_order >= ${cols.wr_order}`;
      await db.execute(uSql);

      const { query, values } = await sqlHelper.insert(`${TABLE.WRITE}${table}`,cols);
      const [insertDone] = await db.execute(query, values);

      if(insertDone.affectedRows==1){
        insertDone.insertId
        const item=await sqlHelper.selectLimit( `${TABLE.VIEW}${table}`,null,{wr_id:insertDone.insertId})//부모내역
        const [[row]]= await db.execute(item.query,item.values)
        return row;
      }

    }

  },
  //댓글수정
  commentEdit: async function (req) {
    const {table, form, id} = req.body;
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);
    const payload={
      ...form
    }
    const wr_id=payload.wr_id
    delete payload.wr_id
    delete payload.wr_ip
    delete payload.wr_create_at
    delete payload.wr_update_at
    delete payload.good
    delete payload.bad
    delete payload.replys

    payload.wr_update_at = at
    payload.wr_ip=ip

    const { query, values } = await sqlHelper.edit(
      `${TABLE.WRITE}${table}`,
      payload,
      {wr_id}
    );
    const [rows] = await db.execute(query, values);
    return rows;
  },
  //댓글삭제
  commentDel: async function (req) {
    const {table, form} = req.body;
    const at = moment().format("YYYY-MM-DD HH:mm:ss");
    const ip = getIp(req);
    const payload={
      ...form
    }
    const wr_id=form.wr_id
    delete payload.wr_id
    delete payload.wr_ip
    delete payload.wr_create_at
    delete payload.wr_update_at
    delete payload.good
    delete payload.bad
    delete payload.replys

    payload.wr_update_at = at
    payload.wr_ip=ip
    payload.wr_use=0
    const { query, values } = await sqlHelper.edit(
      `${TABLE.WRITE}${table}`,
      payload,
      {wr_id}
    );
    const [deleteDone] = await db.execute(query, values);
    console.log(deleteDone);
    return deleteDone;
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
