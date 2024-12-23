const router = require("express").Router();
const boardController = require("./controller/boardController");
const { modelCall } = require("../util/lib");
const upload = require("../util/uploadBoard");


//메뉴리스트
router.get("/:table/menuList", async (req, res) => {
  const result = await modelCall(boardController.menuList, req, res);
  res.json(result);
});


//게시글 추가
router.post("/:table/add", upload().any(), async (req, res) => {
  const result = await modelCall(boardController.add, req, res);
  res.json(result);
});
//게시글 수정
router.put("/:table/:id/edit", upload().any(), async (req, res) => {
  const result = await modelCall(boardController.edit, req, res);
  res.json(result);
});
//게시글 삭제
router.put("/:table/:id/del", async (req, res) => {
  const result = await modelCall(boardController.del, req, res);
  res.json(result);
});


//전체목록수
router.get("/:table/listCount", async (req, res) => {
  const result = await modelCall(boardController.listCount, req, res);
  res.json(result);
});
//특정조건 전체목록수
router.get("/:table/:id/listByWhereCount", async (req, res) => {
  const result = await modelCall(boardController.listByWhereCount, req, res);
  res.json(result);
});
//페이지 목록
router.get("/:table/list", async (req, res) => {
  const result = await modelCall(boardController.list, req, res);
  res.json(result);
});
//where절 목록
router.post("/:table/:id/listByWhere", async (req, res) => {
  const result = await modelCall(boardController.listByWhere, req,res);
  res.json(result);
});
//비멤버 토큰체크
router.post("/:table/:id/tokenModiCheck", async (req, res) => {
  const result = await modelCall(boardController.tokenCheck, req, res);
  res.json(result);
});
router.post("/:table/:id/tokenCheck", async (req, res) => {
  const result = await modelCall(boardController.tokenCheck, req, res);
  res.json(result);
});


//최근 게시물 가져오기
router.get("/:table/:limit/latest", async (req,res)=>{
  const result = await modelCall(boardController.latest, req, res);
  res.json(result)
})
//게시물 관련 목록을 가져옴 // 이전글/다음글/관련글
router.get("/:table/:wrGrp/listPrevNext", async (req,res)=>{
  const result = await modelCall(boardController.listPrevNext, req, res);
  res.json(result)
})
//작성자글 모아보기
router.get("/:table/:wrName/listByWrName", async (req,res)=>{
  const result = await modelCall(boardController.listByWrName, req, res);
  res.json(result)
})
//조회수 증가
router.patch("/:table/:id/viewUp", async (req,res)=>{
  const result = await modelCall(boardController.viewUp, req, res);
  res.json(result)
})
//댓글목록
router.post("/:table/commentList", async (req,res)=>{
  const result = await modelCall(boardController.commentList, req, res);
  res.json(result)
})
//댓글추가
router.post("/:table/commentAdd", async (req,res)=>{
  const result = await modelCall(boardController.commentAdd, req, res);
  res.json(result)
})
//댓글수정
router.put("/:table/commentEdit", async (req,res)=>{
  const result = await modelCall(boardController.commentEdit, req, res);
  res.json(result)
})
//댓글삭제
router.put("/:table/commentDel", async (req,res)=>{
  const result = await modelCall(boardController.commentDel, req, res);
  res.json(result)
})
//댓글리스트갯수 가져오기
router.post("/:table/commentListCount", async (req,res)=>{
  const result = await modelCall(boardController.commentListCount, req, res);
  res.json(result)
})
//대댓글추가
router.post("/:table/:id/replyAdd", async (req,res)=>{
  const result = await modelCall(boardController.replyAdd, req, res);
  res.json(result)
})
//대댓글수정
router.put("/:table/:id/replyEdit", async (req,res)=>{
  const result = await modelCall(boardController.replyEdit, req, res);
  res.json(result)
})
//대댓글삭제
router.put("/:table/:id/replyDel", async (req,res)=>{
  const result = await modelCall(boardController.replyDel, req, res);
  res.json(result)
})
//파일다운로드
router.get("/:table/:filename/download", async (req,res)=>{
  const result = await modelCall(boardController.download, req, res);
  res.json(result)
})


module.exports = router;
