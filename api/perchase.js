const router = require("express").Router();
const perchaseController = require("./controller/perchaseController");

//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await perchaseController.listCount();
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await perchaseController.list(req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await perchaseController.listByWhere(req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await perchaseController.duplCheck(req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await perchaseController.add(req);
  res.json(result);
});
//수정
router.patch("/edit", async (req, res) => {
  const result = await perchaseController.edit(req);
  res.json(result);
});
//삭제
router.patch("/del", async (req, res) => {
  const result = await perchaseController.del(req);
  res.json(result);
});
module.exports = router;
