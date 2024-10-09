const router = require("express").Router();
const configController = require("./controller/configController");
const { modelCall } = require("../util/lib");

//config 구성하기 - 전체가져오기
router.get("/initConfig", async (req, res) => {
  const result = await modelCall(configController.initConfig, req);
  res.json(result);
});
//재기동
router.get("/restart", async (req, res) => {
  const result = await modelCall(configController.restart, req);
  res.json(result);
});
//키,값 중복검사
router.get("/duplCheck/:field/:value", async (req, res) => {
  const result = await modelCall(configController.duplCheck, req);
  res.json(result);
});
//클라이언트/서버리스트 가져오기
router.get("/list", async (req, res) => {
  const result = await modelCall(configController.list, req);
  res.json(result);
});
//저장
router.post("/add", async (req, res) => {
  const result = await modelCall(configController.add, req);
  res.json(result);
});
//정렬수정저장
router.put("/edit", async (req, res) => {
  const result = await modelCall(configController.edit, req);
  res.json(result);
});
//정렬수정저장
router.put("/align", async (req, res) => {
  const result = await modelCall(configController.align, req);
  res.json(result);
});
//삭제
router.delete("/del/:cf_id/:cf_key", async (req, res) => {
  const result = await modelCall(configController.del, req);
  res.json(result);
});
//메뉴 가져오기
router.get("/menu", async (req, res) => {
  const result = await modelCall(configController.menu, req);
  res.json(result);
});

module.exports = router;
