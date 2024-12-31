const router = require("express").Router();
const searchController = require("./controller/searchController");
const { modelCall, resData } = require("../util/lib");
const STATUS = require("../util/STATUS");
const moment = require("../util/moment");

//tag 검색
router.get("/", async (req, res) => {
  const options = req.query;
  const result = await modelCall(searchController.search, options);
  res.json(result);
});

//tag 목록가져오기
router.get("/tagList", async (req, res) => {
  const result = await modelCall(searchController.tagList);
  res.json(result);
});

// search tag에서 리스트 불러오기
router.get("/list", async (req, res) => {
  const result = {};
  result.tags = await modelCall(searchController.tagList);
  result.boards = await modelCall(searchController.boardList);
  const data = result;
  // console.log("result", result);
  res.json(
    resData(
      STATUS.S200.result,
      STATUS.S200.resultDesc,
      moment().format("YYYY-MM-DD HH:mm:ss"),
      data
    )
  );
});
module.exports = router;
