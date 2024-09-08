const router = require("express").Router();
const optionsController = require("./controller/optionsController");
const { modelCall } = require("../util/lib");

//전체테이블
router.get("/tables", async (req, res) => {
  const result = await modelCall(optionsController.tables, req);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(optionsController.listCount, req);
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await modelCall(optionsController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(optionsController.listByWhere, req);
  // const result = await optionsController.listByWhere(req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(optionsController.duplCheck, req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await modelCall(optionsController.add, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(optionsController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(optionsController.del, req);
  res.json(result);
});
module.exports = router;
