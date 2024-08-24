const sqlHelper = {
  //함수만들기 cols는 where절도 같이 들어감
  selectLimit: async function (table, options) {
    // const query = `select * from view_bank ORDER BY 'desc' limit 0,1`;
    let query = `select * from ${table}`;

    let sortby = [];
    let orderby = "";
    let limit = "";
    if (options?.sort) {
      for (let i = 0; i < options.sortBy.length; i++) {
        const sort = ` ${options.sortBy[i].sortBy} ${options.type[i].type} `;
        sortby.push(sort);
      }
      orderby = ` ORDER BY ${sortby.join(",")} `;
    }

    if (options.page !== undefined && options.rowsPerPage !== undefined) {
      const page = (options.page - 1) * options.rowsPerPage;
      limit = ` LIMIT ${page} , ${options.rowsPerPage} `;
    }
    query = `${query} ${orderby} ${limit}`;
    // console.log(query);

    return query;
  },
  //함수만들기 cols는 where절도 같이 들어감
  selectSimpleCount: async function (table) {
    // const query = `select * from ${table}`;
    const query = `select count(*) AS rowsCount from ${table}`;
    return query;
  },
};
module.exports = sqlHelper;
