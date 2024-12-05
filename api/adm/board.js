const router = require("express").Router();
const admBoardController = require("../controller/admBoardController");
const { modelCall } = require("../../util/lib");

//전체카테고리들
router.post("/categories", async (req, res) => {
  const result = await modelCall(admBoardController.categories, req);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(admBoardController.listCount, req);
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await modelCall(admBoardController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(admBoardController.listByWhere, req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(admBoardController.duplCheck, req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await modelCall(admBoardController.add, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(admBoardController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(admBoardController.del, req);
  res.json(result);
});

module.exports = router;
