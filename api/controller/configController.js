const db = require("../../plugins/mysql");
const sqlHelper = require("../../util/sqlHelper");
const { TABLE } = require("../../util/TABLE");
const { LV, isGrant } = require("../../util/level");
const path = require("path");
const fs = require("fs");
const moment = require("../../util/moment");
const { getIp, resData, isEmpty, deepCopy } = require("../../util/lib");
const STATUS = require("../../util/STATUS");

const configController = {
  config: async (req) => {
    try {
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

      // console.log("obj", obj);
      return resData(
        STATUS.S200.result,
        STATUS.S200.resultDesc,
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data
      );
    } catch (error) {
      return await resData(
        STATUS.E500.result, //status
        STATUS.E500.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss")
      );
    }
  },
  menu: async (req) => {
    // const sql = `select * from config`;
    // const [rows] = await db.execute(sql);
    const { all } = req.query;
    // console.log("menu all", req.user);
    if (Boolean(all)) {
      //관리자
      if (!req.user) {
        const data = { err: "세션종료. 다시 로그인해주세요" };

        return resData(
          STATUS.E200.result, //status
          STATUS.E200.resultDesc, //message
          moment().format("YYYY-MM-DD HH:mm:ss"),
          data //data
        );
      }
      if (!isGrant(req, LV.ADMIN)) {
        const data = { err: "관리자 설정 목록 권한이 없습니다" };

        return resData(
          STATUS.E200.result, //status
          STATUS.E200.resultDesc, //message
          moment().format("YYYY-MM-DD HH:mm:ss"),
          data //data
        );
      }
    }
    // console.log($config.client.menu.length);
    const data = {
      rows: $config.client.menu,
      count: $config.client.menu.length,
    };
    return resData(
      STATUS.S200.result,
      STATUS.S200.resultDesc,
      moment().format("YYYY-MM-DD HH:mm:ss"),
      data
    );
  },
  // 설정로드
  load: async () => {
    const { query, values } = await sqlHelper.selectLimit(
      TABLE.CONFIG,
      null,
      null,
      ["cf_key", "cf_val", "cf_client", "cf_type"]
    );
    // console.log("cofing sql", query);
    const [rows] = await db.execute(query);
    global.$config = {
      server: {},
      client: {},
    };

    for (const row of rows) {
      configController.setConfigItem(row, true);
    }
  },

  //설정저장
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
  //설정값 삭제
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

  duplicateCheck: async (req) => {
    try {
      const field = req.params.field;
      const value = req.params.value;

      if (isEmpty(field) || isEmpty(value)) {
        //파라미터체크
        return await resData(
          STATUS.E100.result,
          STATUS.E100.resultDesc,
          moment().format("YYYY-MM-DD HH:mm:ss")
        );
      }
      const payload = {
        [field]: value,
      };

      const sql = sqlHelper.selectLimit(TABLE.CONFIG, null, payload, [
        "COUNT(*) AS cnt",
      ]);
      const [[count]] = await db.execute(sql.query, sql.values);
      // console.log(count);
      //catch로 빠지지지 않도록 조심
      return resData(
        STATUS.S200.result,
        STATUS.S200.resultDesc,
        moment().format("YYYY-MM-DD HH:mm:ss"),
        count
      );
    } catch (e) {
      console.error(e);
      return {
        err: resData(
          STATUS.E300.result,
          STATUS.E300.resultDesc,
          moment().format("YYYY-MM-DD HH:mm:ss")
        ),
      };
    }
  },

  // 그룹가져오기
  async getItems(req) {
    const { all, page, group } = req.query;

    if (Boolean(all)) {
      //관리자
      if (!req.user) {
        const data = { err: "세션종료. 다시 로그인해주세요" };
        return resData(
          STATUS.E200.result, //status
          STATUS.E200.resultDesc, //message
          moment().format("YYYY-MM-DD HH:mm:ss"),
          data //data
        );
      }
      if (!isGrant(req, LV.ADMIN)) {
        const data = { err: "관리자 설정 목록 권한이 없습니다" };
        return resData(
          STATUS.E200.result, //status
          STATUS.E200.resultDesc, //message
          moment().format("YYYY-MM-DD HH:mm:ss"),
          data //data
        );
      }

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
      let groupItems = [];
      //그룹아이템 groupItems
      const groupSql = `select distinct cf_group from config`;
      const [groupsRows] = await db.execute(groupSql);
      console.log("groupsRows", groupsRows);
      groupsRows.forEach((el) => {
        return groupItems.push(el.cf_group); //groupItems [ '기본그룹', '기본설정', '메일발송', '소셜로그인' ]
      });

      if (isEmpty(group)) {
        // 현재탭
        const curTab = Number(page); // 0
        console.log("group", curTab);
        //현재 그룹이름
        curGroup = groupItems[curTab];
        console.log("curGroup", curGroup);
      } else {
        curGroup = group;
      }

      //페이지당 데이터 갯수 {rowsCount:8}
      const pageCntSql = `select count(*) as rowsCount from config where cf_group = '${curGroup}'`;
      const [[rowsCount]] = await db.execute(pageCntSql);
      // console.log("rowsCount", rowsCount);

      //페이지당 데이터
      const pagePerSql = `select * from config where cf_group = '${curGroup}' ${sortSql}`;
      const [rows] = await db.execute(pagePerSql);

      const data = {
        //   * 그룹아이템 배열
        groupItems,
        // 현재그룹이름
        curGroup,
        //  * 페이지당 데이터 갯수
        rowsCount,
        //  * 페이지별 데이터
        rows,
      };

      return resData(
        STATUS.S200.result, //status
        STATUS.S200.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data //data
      );
    } else {
      const data = {
        rows: $config.client,
      };
      return resData(
        STATUS.S200.result, //status
        STATUS.S200.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data //data
      );
    }
  },

  // 설정저장
  async saveConfig(req) {
    const data = req.body;
    const sql = sqlHelper.insert(TABLE.CONFIG, data);
    const [row] = await db.execute(sql.query, sql.values);
    configController.setConfigItem(data); // 설정다시 로드

    return resData(
      STATUS.S200.result, //status
      STATUS.S200.resultDesc, //message
      moment().format("YYYY-MM-DD HH:mm:ss"),
      data //data
    );
  },

  //단일
  sortUpdate(req) {
    console.log("req.body", req.body);
    // 배열로 가져올것 // 그리고 for문으로 업데이트
    req.body.forEach(async (item) => {
      const { cf_key, cf_sort } = item;
      const sql = `update config set cf_sort=${cf_sort} where cf_key='${cf_key}'`;
      await db.execute(sql);
    });
    return true;
  },

  // 설정 삭제
  async removeConfig(req) {
    if (!isGrant(req, LV.SUPER)) {
      const data = { err: "최고관리자만 삭제가 가능합니다" };
      return resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data //data
      );
    }
    const { cf_key } = req.params;
    const sql = sqlHelper.DeleteSimple(TABLE.CONFIG, { cf_key });
    const [row] = await db.execute(sql.query, sql.values);
    // console.log(row);
    configController.clearConfigItem(cf_key); // 설정다시 로드
    return row.affectedRows == 1;
  },

  async restart(req) {
    if (!isGrant(req, LV.SUPER)) {
      const data = { err: "최고관리자만 서버를 재시작 할 수 있습니다" };
      return resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc, //message
        moment().format("YYYY-MM-DD HH:mm:ss"),
        data //data
      );
    }
    process.send({
      type: "config:restart",
      data: "restart",
    });
    return true;
  },
};
module.exports = configController;
