const router = require("express").Router();
const boardController = require("./controller/boardController");
const { modelCall } = require("../util/lib");


//메뉴리스트
router.get("/:table/menuList", async (req, res) => {
  const result = await modelCall(boardController.listCount, req);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(boardController.listCount, req);
  res.json(result);
});
//페이지 목록
router.get("/list", async (req, res) => {
  const result = await modelCall(boardController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(boardController.listByWhere, req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(boardController.duplCheck, req);
  res.json(result);
});
//게시글 추가
router.post("/add", async (req, res) => {
  const result = await modelCall(boardController.add, req);
  res.json(result);
});
//게시글 수정
router.put("/edit", async (req, res) => {
  const result = await modelCall(boardController.edit, req);
  res.json(result);
});
//게시글 삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(boardController.del, req);
  res.json(result);
});
//삭제복구
router.put("/restore", async (req, res) => {
  const result = await modelCall(boardController.restore, req);
  res.json(result);
});
//정렬
router.post("/align", async (req,res)=>{
  const result = await modelCall(boardController.align, req);
  res.json(result)
})

module.exports = router;
