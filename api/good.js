const router = require("express").Router();
const goodController = require("./controller/goodController");
const { modelCall } = require("../util/lib");


//좋아요싫어요 가져오기 목록
router.get("/:bo_table/:wr_id/listByWhere", async (req, res) => {
  const result = await modelCall(goodController.listByWhere, req,res);
  res.json(result);
});
//좋아요 싫어요 추가
router.post("/:bo_table/:wr_id/add", async (req, res) => {
  const result = await modelCall(goodController.add, req,res);
  res.json(result);
});
module.exports = router;
