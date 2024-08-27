const router = require("express").Router();
const optionsController = require("./controller/optionsController");

//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await optionsController.listCount();
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await optionsController.list(req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await optionsController.listByWhere(req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await optionsController.duplCheck(req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await optionsController.add(req);
  res.json(result);
});
//수정
router.patch("/edit", async (req, res) => {
  const result = await optionsController.edit(req);
  res.json(result);
});
//삭제
router.patch("/del", async (req, res) => {
  const result = await optionsController.del(req);
  res.json(result);
});
module.exports = router;
