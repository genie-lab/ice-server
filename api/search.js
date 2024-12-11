const router = require("express").Router();
const searchController = require("./controller/searchController");
const { modelCall } = require("../util/lib");

//서치전체 목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(searchController.listCount, req);
  res.json(result);
});
//서치 목록, 전체 태그 목록,어드민등급 제외한 테이블 목록 가져오기
router.get("/list", async (req, res) => {
  const result = await modelCall(searchController.list, req);
  res.json(result);
});
//서치 where절 목록 특정테이블,또는 전체에서 검색
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(searchController.listByWhere, req);
  res.json(result);
});
//태그 목록 
router.get("/tagList", async (req, res) => {
  const result = await modelCall(searchController.tagList, req);
  res.json(result);
});
//태그 추가
router.post("/add", async (req, res) => {
  const result = await modelCall(searchController.add, req);
  res.json(result);
});
//태그 삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(searchController.del, req);
  res.json(result);
});
module.exports = router;
