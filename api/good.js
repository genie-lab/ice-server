const router = require("express").Router();
const goodController = require("./controller/goodController");
const { modelCall } = require("../util/lib");


//좋아요싫어요 가져오기 목록
router.get("/:table/:id/listByWhere", async (req, res) => {
  const result = await modelCall(goodController.listByWhere, req,res);
  res.json(result);
});
//좋아요 싫어요 추가
router.post("/:table/:id/add", async (req, res) => {
  const result = await modelCall(goodController.add, req,res);
  res.json(result);
});
//좋아요 싫어요 삭제
router.delete("/:table/:id/del", async (req, res) => {
  const result = await modelCall(goodController.del, req,res);
  res.json(result);
});

module.exports = router;
