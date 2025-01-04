const router = require("express").Router();
const admStoreController = require("../controller/admStoreController");
const { modelCall } = require("../../util/lib");

//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(admStoreController.listCount, req);
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await modelCall(admStoreController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(admStoreController.listByWhere, req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(admStoreController.duplCheck, req);
  res.json(result);
});
//추가
router.post("/add", async (req, res) => {
  const result = await modelCall(admStoreController.add, req);
  res.json(result);
});
//수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(admStoreController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(admStoreController.del, req);
  res.json(result);
});
//삭제복구
router.put("/restore", async (req, res) => {
  const result = await modelCall(admStoreController.restore, req);
  res.json(result);
});
//정렬
router.post("/align", async (req,res)=>{
  const result = await modelCall(admStoreController.align, req);
  res.json(result)
})

module.exports = router;
