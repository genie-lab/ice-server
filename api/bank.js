const router = require("express").Router();
const bankController = require("./controller/bankController");
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await bankController.listCount();
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await bankController.list(req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await bankController.listByWhere(req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await bankController.duplCheck(req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await bankController.add(req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await bankController.edit(req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await bankController.del(req);
  res.json(result);
});

module.exports = router;
