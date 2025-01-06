const router = require("express").Router();
const storeGoodController = require("./controller/storeGoodController");
const { modelCall } = require("../util/lib");


//좋아요싫어요 가져오기 목록
router.get("/:st_table/:vi_id/listByWhere", async (req, res) => {
  const result = await modelCall(storeGoodController.listByWhere, req,res);
  res.json(result);
});
//좋아요 싫어요 추가
router.post("/:st_table/:vi_id/add", async (req, res) => {
  const result = await modelCall(storeGoodController.add, req,res);
  res.json(result);
});
module.exports = router;
