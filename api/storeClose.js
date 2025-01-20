const router = require("express").Router();
const storeCloseController = require("./controller/storeCloseController");
const { modelCall } = require("../util/lib");

//페이지 목록
router.post("/list", async (req, res) => {
  const result = await modelCall(storeCloseController.list, req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await modelCall(storeCloseController.add, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(storeCloseController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(storeCloseController.del, req);
  res.json(result);
});
module.exports = router;
