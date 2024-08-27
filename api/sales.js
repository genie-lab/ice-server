const router = require("express").Router();
const salesController = require("./controller/salesController");

//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await salesController.listCount();
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await salesController.list(req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await salesController.listByWhere(req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await salesController.duplCheck(req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await salesController.add(req);
  res.json(result);
});
//수정
router.patch("/edit", async (req, res) => {
  const result = await salesController.edit(req);
  res.json(result);
});
//삭제
router.patch("/del", async (req, res) => {
  const result = await salesController.del(req);
  res.json(result);
});
module.exports = router;
