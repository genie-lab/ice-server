const router = require("express").Router();
const admStoreInfoController = require("../controller/admStoreInfoController");
const { modelCall } = require("../../util/lib");

//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(admStoreInfoController.listByWhere, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(admStoreInfoController.edit, req);
  res.json(result);
});
module.exports = router;
