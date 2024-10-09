const db = require("../../plugins/mysql");
const sqlHelper = require("../../util/sqlHelper");
const { TABLE } = require("../../util/TABLE");
const { LV, isGrant } = require("../../util/level");
const path = require("path");
const fs = require("fs");
const moment = require("../../util/moment");
const { getIp, resData, isEmpty, deepCopy } = require("../../util/lib");
const STATUS = require("../../util/STATUS");
const qs = require("qs");

const configController = {
  //config 구성하기 - 전체가져오기
  initConfig: async (req) => {
    const obj = {
      ...$config.server,
      ...$config.client,
    };
    if (obj == null) {
      configController.load();
      const config = {
        ...$config.server,
        ...$config.client,
      };

      return config;
    }
    const data = obj;

    return data;
  },
  //설정로드
  load: async () => {
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.CONFIG,
      null,
      null,
      ["cf_key", "cf_val", "cf_client", "cf_type"]
    );
    const [rows] = await db.execute(query);
    global.$config = {
      server: {},
      client: {},
    };

    for (const row of rows) {
      configController.setConfigItem(row, true);
    }
  },
  //클라이언트/서버 나누기
  setConfigItem: async (item, isLoad = false) => {
    configController.clearConfigItem(item.cf_key, isLoad); // 값만 지움

    //json parsing
    if (item.cf_type == "Json") {
      item.cf_val = JSON.parse(item.cf_val);
    }
    if (item.cf_client) {
      $config.client[item.cf_key] = item.cf_val;
    } else {
      $config.server[item.cf_key] = item.cf_val;
    }
    //초기로드가 아니면 메시지를 보낸다
    if (!isLoad) {
      process.send({
        type: "config:update",
        data: item,
      });
    }
  },
  //기존 지울값 정리
  clearConfigItem: async (cf_key, isLoad = false) => {
    delete $config.server[cf_key]; // 설정값 삭제
    delete $config.client[cf_key]; // 설정값 삭제

    if (!isLoad) {
      process.send({
        type: "config:remove",
        data: cf_key,
      });
    }
  },

  //////////////////////////////////////////////

  //재기동
  restart: async (req) => {
    // if (!isGrant(req, LV.SUPER)) {
    //   const data = { err: "최고관리자만 서버를 재시작 할 수 있습니다" };
    //   return resData(
    //     STATUS.E200.result, //status
    //     STATUS.E200.resultDesc, //message
    //     moment().format("YYYY-MM-DD HH:mm:ss"),
    //     data //data
    //   );
    // }
    const result = process.send({
      type: "config:restart",
      data: "restart",
    });
    // console.log(result);
    return result;
  },
  //키,값 중복검사
  duplCheck: async (req) => {
    const field = req.params.field;
    const value = req.params.value;

    const payload = {
      [field]: value,
    };

    const sql = await sqlHelper.selectLimit(TABLE.CONFIG, null, payload, [
      "COUNT(*) AS count",
    ]);
    const [[{ count }]] = await db.execute(sql.query, sql.values);
    // console.log(count);
    return count;
  },
  //클라이언트/서버리스트 가져오기
  list: async (req) => {
    const { all, page, group } = req.query;

    if (Boolean(all)) {
      //관리자
      // if (!req.user) {
      //   const data = { err: "세션종료. 다시 로그인해주세요" };
      //   return resData(
      //     STATUS.E200.result, //status
      //     STATUS.E200.resultDesc, //message
      //     moment().format("YYYY-MM-DD HH:mm:ss"),
      //     data //data
      //   );
      // }
      // if (!isGrant(req, LV.ADMIN)) {
      //   const data = { err: "관리자 설정 목록 권한이 없습니다" };
      //   return resData(
      //     STATUS.E200.result, //status
      //     STATUS.E200.resultDesc, //message
      //     moment().format("YYYY-MM-DD HH:mm:ss"),
      //     data //data
      //   );
      // }

      const sortBy = {
        cf_group: true,
        cf_sort: true,
      };

      //정렬규칙 추가
      let sortSql = "";
      if (sortBy) {
        let sort = [];
        const keys = Object.keys(sortBy);
        for (const key of keys) {
          // `orderby cf_group ASC`;
          sort.push(key + (sortBy[key] ? " ASC " : " DESC "));
        }
        if (sortBy) {
          sortSql = ` ORDER BY ` + sort; //ORDER BY cf_group ASC ,cf_sort ASC
        }
      }

      /**
       * 받을 것 :
       * 그룹아이템 배열
       * 페이지당 데이터 갯수
       * 페이지별 데이터
       * 현재그룹이름
       */
      let curGroup = "";
      let groupRows = [];
      //그룹아이템 groupItems
      const groupSql = `select distinct cf_group from config`;
      const [groupItems] = await db.execute(groupSql);
      groupItems.forEach((el) => {
        return groupRows.push(el.cf_group); //groupItems [ '기본그룹', '기본설정', '메일발송', '소셜로그인' ]
      });

      if (isEmpty(group)) {
        // 현재탭
        const curTab = Number(page); // 0
        //현재 그룹이름
        curGroup = groupRows[curTab];
      } else {
        curGroup = group;
      }

      //페이지당 데이터 갯수 {rowsCount:8}
      const pageCntSql = `select count(*) as rowsCount from config where cf_group = '${curGroup}'`;
      const [[rowsCount]] = await db.execute(pageCntSql);
      //페이지당 데이터
      const pagePerSql = `select * from config where cf_group = '${curGroup}' ${sortSql}`;
      const [rows] = await db.execute(pagePerSql);

      const data = {
        // 그룹아이템 배열
        groupRows,
        // 페이지당 데이터 갯수
        rowsCount,
        // 페이지별 데이터
        rows,
        // 현재그룹이름
        curGroup,
      };
      return data; //data
    } else {
      const data = {
        rows: $config.client,
      };
      return data;
    }
  },
  //저장
  add: async (req) => {
    const data = req.body;
    const sql = await sqlHelper.insert(TABLE.CONFIG, data);
    // console.log(sql);
    const [row] = await db.execute(sql.query, sql.values);
    console.log(row.insertId);
    // data.cf_id = row.insertId;
    configController.setConfigItem(data); // 설정다시 로드
    return data;
  },

  //내용수정
  edit: async (req) => {
    const cols = req.query;
    const data = req.body;
    const { query, values } = await sqlHelper.edit(TABLE.CONFIG, data, cols);
    configController.setConfigItem(data); // 설정다시 로드
    await db.execute(query, values);
    return data;
  },
  //정렬수정저장
  align: async (req) => {
    // 배열로 가져올것 // 그리고 for문으로 업데이트
    req.body.forEach(async (item) => {
      const { cf_key, cf_sort } = item;
      const sql = `update config set cf_sort=${cf_sort} where cf_key='${cf_key}'`;
      await db.execute(sql);
    });
    return true;
  },
  //삭제
  del: async (req) => {
    // if (!isGrant(req, LV.SUPER)) {
    //   const data = { err: "최고관리자만 삭제가 가능합니다" };
    //   return resData(
    //     STATUS.E200.result, //status
    //     STATUS.E200.resultDesc, //message
    //     moment().format("YYYY-MM-DD HH:mm:ss"),
    //     data //data
    //   );
    // }
    const cols = req.params;
    // console.log(cols);
    const { query, values } = await sqlHelper.del(TABLE.CONFIG, cols);
    // console.log(query);
    const [row] = await db.execute(query, values);
    configController.clearConfigItem(cols.cf_key); // 설정다시 로드
    return row;
  },
  //클라이언트/서버리스트 가져오기
  menu: async (req) => {
    //관리자
    // if (!req.user) {
    //   const data = { err: "세션종료. 다시 로그인해주세요" };
    //   return resData(
    //     STATUS.E200.result, //status
    //     STATUS.E200.resultDesc, //message
    //     moment().format("YYYY-MM-DD HH:mm:ss"),
    //     data //data
    //   );
    // }
    // if (!isGrant(req, LV.ADMIN)) {
    //   const data = { err: "관리자 설정 목록 권한이 없습니다" };
    //   return resData(
    //     STATUS.E200.result, //status
    //     STATUS.E200.resultDesc, //message
    //     moment().format("YYYY-MM-DD HH:mm:ss"),
    //     data //data
    //   );
    // }

    //페이지당 데이터
    const cols = {
      cf_key: "menu",
    };
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.CONFIG,
      null,
      cols
    );
    // console.log(query, values);
    const [row] = await db.execute(query, values);
    return row;
  },
};

module.exports = configController;
