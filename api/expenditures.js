const router = require("express").Router();
const expendituresController = require("./controller/expendituresController");
const { modelCall } = require("../util/lib");

//전체카테고리들
router.post("/categories", async (req, res) => {
  const result = await modelCall(expendituresController.categories, req);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(expendituresController.listCount, req);
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await modelCall(expendituresController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(expendituresController.listByWhere, req);
  // const result = await expendituresController.listByWhere(req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(expendituresController.duplCheck, req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await modelCall(expendituresController.add, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(expendituresController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(expendituresController.del, req);
  res.json(result);
});
module.exports = router;
