const router = require("express").Router();
const salesController = require("./controller/salesController");
const { modelCall } = require("../util/lib");

//전체카테고리들
router.post("/categories", async (req, res) => {
  const result = await modelCall(salesController.categories, req);
  console.log(result);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(salesController.listCount, req);
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await modelCall(salesController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(salesController.listByWhere, req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(salesController.duplCheck, req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await modelCall(salesController.add, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(salesController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(salesController.del, req);
  res.json(result);
});
module.exports = router;
