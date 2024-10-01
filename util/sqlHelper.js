const db = require("../plugins/mysql");

const sqlHelper = {
  //함수만들기 cols는 where절도 같이 들어감
  selectLimit: async function (
    table = "",
    options = null,
    cols = null,
    funcs = null,
    searchCols = null
  ) {
    // const query = `select * from view_bank ORDER BY 'desc' limit 0,1`;
    let query = `select * from ${table}`;

    if (funcs?.length > 0) {
      query = query.replace("*", funcs.join(","));
    }

    let sortby = [];
    let orderby = "";
    let limit = "";
    //정렬
    if (options?.sortBy && options?.type) {
      for (let i = 0; i < options.sortBy.length; i++) {
        const sort = ` ${options.sortBy[i]} ${options.type[i]} `;
        sortby.push(sort);
      }
      orderby = ` ORDER BY ${sortby.join(",")} `;
    }

    //페이지
    if (options?.page !== undefined && options?.rowsPerPage !== undefined) {
      const page = options.page * options.rowsPerPage;
      limit = ` LIMIT ${page} , ${options.rowsPerPage} `;
    }

    let search = "";
    //서치
    if (options?.search) {
      const str = options.search;
      const arr = str.split(" ");
      const like = arr.join("|");
      const regexp = ` regexp '${like}' `;
      let searchKey = searchCols.map((s) => {
        return ` ${s} ${regexp} `;
      });
      search = searchKey.join(" or ");
      search = ` WHERE ${search} `;
      // //서치할때는 전체페이지에서 찾기
    }
    // console.log("search>", search);

    //where
    let key = [];
    let values = [];

    if (cols) {
      for (c in cols) {
        key.push(c + "=?");
        values.push(cols[c]);
      }
      key = key.join(" and ");
      key = `WHERE ${key} `;
      key = search ? null : key;
    }
    // console.log("query", `${key} `);
    query = `${query} ${search} ${key} ${orderby} ${limit}`;

    return { query, values };
  },
  //함수만들기 cols는 where절도 같이 들어감
  selectSimpleCount: async function (table, options = {}, searchCols = []) {
    // const query = `select * from ${table}`;
    let search = "";
    //서치
    if (options?.search) {
      const str = options.search;
      const arr = str.split(" ");
      const like = arr.join("|");
      const regexp = ` regexp '${like}' `;
      let searchKey = searchCols.map((s) => {
        return ` ${s} ${regexp} `;
      });
      search = searchKey.join(" or ");
      search = ` WHERE ${search} `;
      // //서치할때는 전체페이지에서 찾기
    }
    const query = `select count(*) AS rowsCount from ${table} ${search}`;

    return query;
  },
  //추가
  insert: async function (table, payload) {
    let query = `INSERT INTO ${table} ( {1} ) VALUES ( {2} );`;
    let key = [];
    let values = [];
    let qs = [];
    if (payload) {
      for (p in payload) {
        key.push(p);
        qs.push(p);
        values.push(payload[p]);
      }
      key = key.join(",");
      qs.fill("?").join(",");
      query = query.replace("{1}", key);
      query = query.replace("{2}", qs.fill("?").join(","));
    }
    // `INSERT INTO ${table}(b_name,b_account,b_host,b_location,b_ip_at,mb_id) VALUES ('국민','Dmk46NLP84','신진이','홍대','localhost','genie'); `;
    return { query, values };
  },

  //수정삭제
  edit: async function (table, payload, cols) {
    let query = `UPDATE ${table} SET {1} WHERE {2} ;`;
    let key = [];
    let values = [];
    let where = [];

    if (payload) {
      for (p in payload) {
        key.push(`${p}=?`);
        values.push(payload[p]);
      }
      key = key.join(",");
      query = query.replace("{1}", key);
    }
    if (cols) {
      const keys = Object.keys(cols);
      query = query.replace("{2}", `${keys[0]}=?`);
      values.push(cols[keys[0]]);
    }

    return { query, values };
  },

  //컬럼명
  colnames(table) {
    const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}';`;
    return sql;
  },
};
module.exports = sqlHelper;
