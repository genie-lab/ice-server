const app = require("express");
const router = app.Router();
const { modelCall } = require("../util/lib");
const popupController = require("./controller/popupController");
const uplpad = require("../util/uploadMulter");

//추가
router.post("/add", uplpad("popup").any(), async (req, res) => {
  const result = await modelCall(popupController.add, req);
  res.json(result);
});
//수정
router.put("/edit", uplpad("popup").any(), async (req, res) => {
  const result = await modelCall(popupController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(popupController.del, req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(popupController.duplCheck, req);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(popupController.listCount);
  res.json(result);
});
//회원목록
router.get("/list", async (req, res) => {
  const result = await modelCall(popupController.list, req);
  res.json(result);
});

//where절 목록
router.get("/listByWhere", async (req, res) => {
  const result = await modelCall(popupController.listByWhere, req);
  res.json(result);
});
//where절 목록
router.get("/displayList", async (req, res) => {
  const result = await modelCall(popupController.displayList, req);
  res.json(result);
});
//get
router.get("/get", async (req, res) => {
  const result = await modelCall(popupController.get, req);
  res.json(result);
});
//set
router.post("/set", uplpad("test").any(), async (req, res) => {
  const result = await modelCall(popupController.set, req);
  res.json(result);
});

module.exports = router;
