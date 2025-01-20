const router = require("express").Router();
const storeSpendController = require("./controller/storeSpendController");
const { modelCall } = require("../util/lib");

//전체카테고리들
router.post("/categories", async (req, res) => {
  const result = await modelCall(storeSpendController.categories, req);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(storeSpendController.listCount, req);
  res.json(result);
});
//페이지 목록
router.post("/list", async (req, res) => {
  const result = await modelCall(storeSpendController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(storeSpendController.listByWhere, req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(storeSpendController.duplCheck, req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await modelCall(storeSpendController.add, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(storeSpendController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(storeSpendController.del, req);
  res.json(result);
});
module.exports = router;
