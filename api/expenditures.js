const router = require("express").Router();
const expendituresController = require("./controller/expendituresController");

//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await expendituresController.listCount();
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await expendituresController.list(req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await expendituresController.listByWhere(req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await expendituresController.duplCheck(req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await expendituresController.add(req);
  res.json(result);
});
//수정
router.patch("/edit", async (req, res) => {
  const result = await expendituresController.edit(req);
  res.json(result);
});
//삭제
router.patch("/del", async (req, res) => {
  const result = await expendituresController.del(req);
  res.json(result);
});
module.exports = router;
