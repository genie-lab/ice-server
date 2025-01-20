const moment = require("moment");

const sqlHelper = {
  //함수만들기 cols는 where절도 같이 들어감
  selectLimit: async function (table = "",options = null,cols = null,funcs = [],searchCols = null) {

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

    //서치
    let search=null;
    if (options?.search) {
      const type = options?.searchType;
      const cols = options?.searchCols;
      const str = options?.search;

      // //서치할때는 전체페이지에서 찾기
      let arr, like, regexp, searchKey;
      switch (type) {
        case '내용포함':
          arr = str.split(" ");
          like = arr.join("|");
          regexp = ` regexp '${like}' `;
          searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
          search = searchKey.join(" or ");
          break;

        case '기간':
          arr = str.split("~"); //arr[0] ror arr[1]
          searchKey=[];
          if(arr?.length>0){
            if(arr?.length==2){
              for(const col of cols){ // 1 <= col ~ 5 <= col
                const str = ` ( ${col} between '${arr[0]}' and '${moment(arr[1]).add(1,'days').format('YYYY-MM-DD')}' ) `
                searchKey.push(str)
              }
            }
            if(arr?.length==1){
              const date = moment(arr[0]).add(1,'days').format('YYYY-MM-DD')
              arr.push(date)
              for(const col of cols){ // 1 <= col ~ 5 <= col
                const str = ` ( ${col} between '${arr[0]}' and '${arr[1]}' ) `
                searchKey.push(str)
              }
            }
          }
          search = searchKey.join(" or ");
          break;

        case '이상':
          if(typeof cols == 'object'){ search = `${cols.name} >= ${Number(str)}`;
          }else if(cols){ search = `${cols} >= ${Number(str)}`;
          }else{
            arr = str.split(" ");
            like = arr.join("|");
            regexp = ` regexp '${like}' `;
            searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
            search = searchKey.join(" or ");
          }
          break;

        case '이하':
          if(typeof cols == 'object'){ search = `${cols.name} <= ${Number(str)}`;
          }else if(cols){ search = `${cols} <= ${Number(str)}`;
          }else{
            arr = str.split(" ");
            like = arr.join("|");
            regexp = ` regexp '${like}' `;
            searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
            search = searchKey.join(" or ");
          }
          break;

        default:
          arr = str.split(" ");
          like = arr.join("|");
          regexp = ` regexp '${like}' `;
          searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
          search = searchKey.join(" or ");
          break;
      }
      search = ` ${search} `;
    }

    //where
    let key = [];
    let values = [];

    if (cols) {
      for (c in cols) {
        switch (typeof cols[c]) {
          case "number":
            cols[c] = cols[c] ? Number(cols[c]) : cols[c];
            break;
          case "boolean":
            cols[c] = cols[c] ? cols[c] == "true" : cols[c];
            break;
          default:
            cols[c] = cols[c] || cols[c];
        }
        key.push(c + "=?");
        values.push(cols[c]);
      }
      key = key.join(" and ");
      key = ` ${key} `;
      key = search ? `WHERE ${key} and ${search}` : `WHERE ${key}`;
    }else{
      key = search ? `WHERE ${search}` : '';
    }
    query = `${query} ${key} ${orderby} ${limit}`;
    return { query, values };
  },

  //함수만들기 cols는 where절도 같이 들어감
  selectSimpleCount: async function (table, options = {},cols=null, searchCols = []) {
    // const query = `select * from ${table}`;

    //서치
    let search=null;
    if (options?.search) {
      const type = options?.searchType;
      const cols = options?.searchCols;
      const str = options?.search;

      // //서치할때는 전체페이지에서 찾기
      let arr, like, regexp, searchKey;
      switch (type) {
        case '내용포함':
          arr = str.split(" ");
          like = arr.join("|");
          regexp = ` regexp '${like}' `;
          searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
          search = searchKey.join(" or ");
          break;

        case '기간':
          arr = str.split("~"); //arr[0] ror arr[1]
          searchKey=[];
          if(arr?.length>0){
            if(arr?.length==2){
              for(const col of cols){ // 1 <= col ~ 5 <= col
                const str = ` ( ${col} between '${arr[0]}' and '${moment(arr[1]).add(1,'days').format('YYYY-MM-DD')}' ) `
                searchKey.push(str)
              }
            }
            if(arr?.length==1){
              const date = moment(arr[0]).add(1,'days').format('YYYY-MM-DD')
              arr.push(date)
              for(const col of cols){ // 1 <= col ~ 5 <= col
                const str = ` ( ${col} between '${arr[0]}' and '${arr[1]}' ) `
                searchKey.push(str)
              }
            }
          }
          search = searchKey.join(" or ");
          break;

        case '이상':
          if(typeof cols == 'object'){ search = `${cols.name} >= ${Number(str)}`;
          }else if(cols){ search = `${cols} >= ${Number(str)}`;
          }else{
            arr = str.split(" ");
            like = arr.join("|");
            regexp = ` regexp '${like}' `;
            searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
            search = searchKey.join(" or ");
          }
          break;

        case '이하':
          if(typeof cols == 'object'){ search = `${cols.name} <= ${Number(str)}`;
          }else if(cols){ search = `${cols} <= ${Number(str)}`;
          }else{
            arr = str.split(" ");
            like = arr.join("|");
            regexp = ` regexp '${like}' `;
            searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
            search = searchKey.join(" or ");
          }
          break;

        default:
          arr = str.split(" ");
          like = arr.join("|");
          regexp = ` regexp '${like}' `;
          searchKey = searchCols.map((s) => { return ` ${s} ${regexp} `; });
          search = searchKey.join(" or ");
          break;
      }
      search = ` ${search} `;
    }

    //where
    let key = [];
    let values = [];

    if (cols) {
      for (c in cols) {
        switch (typeof cols[c]) {
          case "number":
            cols[c] = cols[c] ? Number(cols[c]) : cols[c];
            break;
          case "boolean":
            cols[c] = cols[c] ? cols[c] == "true" : cols[c];
            break;
          default:
            cols[c] = cols[c] || cols[c];
        }
        key.push(c + "=?");
        values.push(cols[c]);
      }
      key = key.join(" and ");
      key = ` ${key} `;
      key = search ? `WHERE ${key} and ${search}` : `WHERE ${key}`;
    }else{
      key = search ? `WHERE ${search}` : '';
    }

    const query = `select count(*) AS rowsCount from ${table} ${key}`;
    return {query,values};
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
  //영구삭제
  del: async function (table, cols) {
    let query = `DELETE FROM ${table} `;
    let key = [];
    let values = [];

    if (cols) {
      for (c in cols) {
        key.push(c + "=?");
        values.push(cols[c]);
      }
      key = key.join(" and ");
      key = `WHERE ${key} `;
    }

    query = `${query} ${key} `;

    return { query, values };
  },

  //컬럼명
  colnames(table) {
    const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}';`;
    return sql;
  },

  //필드뽑음
  selectIn(table, field, arr, cols=[]){
    let query = `SELECT * FROM ${table} WHERE ${field} IN ({1})`;
    const prepare = Array(arr.length).fill('?');
    query = query.replace('{1}', prepare.join(', '));

    //쿼리필드가 있으면 치환함
    if(cols.length > 0){
      query = query.replace('*', cols.join(','));
    }
    return { query, values:arr };
  },
};
module.exports = sqlHelper;
