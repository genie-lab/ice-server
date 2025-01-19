const router = require("express").Router();
const boardController = require("./controller/boardController");
const upload = require("../util/uploadBoard");
const STATUS = require("../util/STATUS");
const moment = require("../util/moment");
const { modelCall, getIp, resData } = require("../util/lib");
const { LV, isGrant } = require("../util/level");
const ssrTokenAuth = require("../plugins/ssrTokenAuth");
const randToken = require("rand-token"); //Generate a 16 character alpha-numeric token
const fs = require("fs");
const db = require("../plugins/mysql");

/////////////////// 수정 접근 권한 확인 ////////////////// isModify(bo_table, req.user[0], data, checkToken, token);
async function isModify(bo_table, member, data=null, checkToken, token) {
  // console.log("checkToken, token", checkToken, token);
  let msg = "수정권한이 없습니다";
  if (member) {
    //관리자이거나 자신이 작성한 글이면
    if (member.mb_level >= LV.ADMIN || member.mb_id == data?.mb_id) {
      msg = "";
    }
  } else if (data?.mb_id == 0) {
    // 비회원 작성글이면 mb_id는 String이다
    if (checkToken) {
      if (checkToken === token) {
        msg = "";
      } else {
        msg = "토큰이 올바르지 않습니다";
      }
    } else {
      const wr_id = data?.wr_id;
      const password = data?.wr_password;
      const cnt = await modelCall(boardController.checkItem,bo_table,wr_id,password);
      if (cnt == 1) {
        msg = "";
      } else {
        msg = "비밀번호가 올바르지 않습니다";
      }
    }
  }
  return msg;
}
async function isMember(req){
  return req?.user?.length > 0 ? req?.user[0] : null
}

// // 관리자 게시판 설정 가져오기*
router.get("/:bo_table/config", async (req, res) => {
  const { bo_table } = req.params;
  const result = await modelCall(boardController.getConfig, bo_table);
  res.json(result);
});

//메뉴리스트*
router.get("/:bo_table/menuList", async (req, res) => {
  const { bo_table } = req.params;
  const config = await modelCall(boardController.getConfig, bo_table);
  const result = await modelCall(boardController.menuList, config, bo_table);
  res.json(result);
});

//게시글 추가*
router.post("/:bo_table/add", upload().any(), async (req, res) => {
  const { bo_table } = req.params;
  // console.log('req.files',req.files);
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_write_level);
  if (!grant) {
    return res.json(
      resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc + " 작성 권한이 없습니다. ", //message
        moment().format("YYYY-MM-DD HH:mm:ss")
      )
    );
  }
  const data = req.body;
  // console.log("data", req.files);
  data.wr_ip = getIp(req);
  // console.log("data.wr_ip", data.wr_ip);
  const result = await modelCall(boardController.add, bo_table,data,req);
  res.json(result);// wr_id; 글게시번호
});

//게시글 수정*
router.put("/:bo_table/edit", upload().any(), async (req, res) => {
  const { bo_table } = req.params;
  const member = await isMember(req);
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_write_level);
  if (!grant) {
    return res.json(
      resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc + " 작성 권한이 없습니다. ", //message
        moment().format("YYYY-MM-DD HH:mm:ss")
      )
    );
  }

  const data = req.body;
  let modifyMsg = await isModify(bo_table,member,data,req.session.checkToken,data.token);
  delete data.token;

  if (modifyMsg) {
    return res.json(
      resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc + " " + modifyMsg, //message
        moment().format("YYYY-MM-DD HH:mm:ss")
      )
    );
  }
  data.wr_ip = getIp(req);
  const result = await modelCall(boardController.edit, bo_table,data,req);
  res.json(result);
});

//게시글 삭제*
router.put("/:bo_table/:wr_id/:wr_grp/del", async (req, res) => {
  const { bo_table, wr_id,wr_grp } = req.params;
  const {data,token} = req.body;
  const member = await isMember(req);
  const checkToken = req.session.checkToken;
  const ip = getIp(req);
  req.session.checkToken = null;
  const modifyMsg = await isModify(bo_table, member, data, checkToken, token);
  if (modifyMsg) {return res.json({ err: modifyMsg });}
  const result = await modelCall(boardController.del, bo_table,wr_id,wr_grp,member,ip);
  console.log('result',result);
  res.json(result);
});


// //전체목록수
// router.get("/:bo_table/listCount", async (req, res) => {
//   const result = await modelCall(boardController.listCount, req, res);
//   res.json(result);
// });
// //특정조건 전체목록수
// router.get("/:bo_table/:wr_id/listByWhereCount", async (req, res) => {
//   const result = await modelCall(boardController.listByWhereCount, req, res);
//   res.json(result);
// });

//게시물 목록을 가져옴*
router.post("/:bo_table/list", async (req, res) => {
  const { bo_table } = req.body;
  const { options } = req.body;
  const host = `${req.protocol}://${req.headers.host}`;
  const member = await isMember(req);
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_list_level);
  if (!grant) {
    return res.json(
      resData(
        STATUS.E200.result, //status
        STATUS.E200.resultDesc + " 목록보기 권한이 없습니다. ", //message
        moment().format("YYYY-MM-DD HH:mm:ss")
      )
    );
  }
  const result = await modelCall(boardController.list, config,bo_table,options,member,host);
  res.json(result);
});

//게시물 읽기 where절 목록*
router.get("/:bo_table/:wr_id/listByWhere", async (req, res) => {
  const host = `${req.protocol}://${req.headers.host}`;
  const { bo_table, wr_id } = req.params;
  const member = await isMember(req);
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_list_level);
  if (!grant) {
    return res.json({ err: "목록읽기 권한이 없습니다." });
  }
  const result = await modelCall(boardController.getItem, bo_table,wr_id,member,host);
  res.json(result);
});

//비멤버 토큰체크 - 비밀번호 확인*
router.post("/:bo_table/check/:wr_id", async (req, res) => {
  const { bo_table, wr_id } = req.params;
  const password = req.body.pw;
  const cnt = await modelCall(boardController.checkItem,bo_table,wr_id,password);
  if (cnt == 1) {
    const token = randToken.generate(16);
    req.session.checkToken = token;
    return res.json(token);
  } else {
    return res.json({ err: "비밀번호가 올바르지 않습니다" });
  }
});

//최근 게시물 가져오기*
router.get("/:bo_table/:limit/latest", async (req,res)=>{
  const {bo_table,limit} = req.params;
  const host = `${req.protocol}://${req.headers.host}`;
  const config = await modelCall(boardController.getConfig, bo_table);
  const result = await modelCall(boardController.latest, config,bo_table,limit, host);
  res.json(result)
})
//게시물 관련 목록을 가져옴 // 이전글/다음글/관련글*
router.get("/:bo_table/:wr_grp/listPrevNext", async (req,res)=>{
  const { bo_table, wr_grp } = req.params;
  const result = await modelCall(boardController.getInfo, bo_table,wr_grp);
  res.json(result)
})
//작성자글 모아보기 - 게시물 관련 목록을 가져옴2*
router.get("/:bo_table/:wr_grp/infoGrp", async (req,res)=>{
  const {bo_table, wr_grp} = req.params
  const config = await modelCall(boardController.getConfig, bo_table);
  const result = await modelCall(boardController.getInfoGrp,config,bo_table,wr_grp,req);
  res.json(result);
})
//조회수 증가*
router.patch("/:bo_table/:wr_id/viewUp", async (req,res)=>{
  const { bo_table, wr_id } = req.params;
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_list_level);
  if (!grant) {
    return res.json({ err: "목록읽기 권한이 없습니다." });
  }
  const result = await modelCall(boardController.viewUp, bo_table, wr_id);
  res.json(result)
})
//댓글목록*
router.post("/:bo_table/:wr_reply/commentList", async (req,res)=>{
  const { bo_table, wr_reply } = req.params;
  const member = await isMember(req)
  const result = await modelCall(boardController.commentList, bo_table,Number(wr_reply), req.body, member);
  res.json(result)
})
//댓글추가*
router.post("/:bo_table/commentAdd", async (req,res)=>{
  const { bo_table } = req.params;
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_reply_level);
  if (!grant) {
    return res.json({ err: "답글작성 권한이 없습니다." });
  }
  const data = { ...req.body?.data, wr_ip : getIp(req)};
  const result = await modelCall(boardController.commentAdd, bo_table, data);
  res.json(result)
})
//댓글수정*
router.put("/:bo_table/commentEdit", async (req,res)=>{
  const { bo_table } = req.params;
  const member = await isMember(req)
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_reply_level);
  if (!grant) {
    return res.json({ err: "댓글수정 권한이 없습니다." });
  }
  const data = req.body;
  let result = null;
  req.session.checkToken = null;
  // 수정권한 확인
  let modifyMsg = await isModify(bo_table, member, data);
  if (modifyMsg) {
    result = { err: modifyMsg };
  } else {
    data.wr_ip = getIp(req);
    result = await modelCall(boardController.commentEdit, bo_table, data);
  }
  res.json(result);
})
//댓글삭제
router.delete("/:bo_table/:wr_id/commentDel", async (req,res)=>{
  const { bo_table,wr_id } = req.params;
  const member = await isMember(req)
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_reply_level);
  if (!grant) {
    return res.json({ err: "댓글삭제 권한이 없습니다." });
  }
  // const result = await modelCall(boardController.del, bo_table,wr_id,member);
  const result = await modelCall(boardController.commentDel, bo_table,wr_id,member);
  res.json(result)
})
// //댓글리스트갯수 가져오기
// router.post("/:bo_table/commentListCount", async (req,res)=>{
//   const result = await modelCall(boardController.commentListCount, req, res);
//   res.json(result)
// })

// //대댓글수정
// router.put("/:bo_table/:wr_id/replyEdit", async (req,res)=>{
//   const result = await modelCall(boardController.replyEdit, req, res);
//   res.json(result)
// })
// //대댓글삭제
// router.put("/:bo_table/:wr_id/replyDel", async (req,res)=>{
//   const result = await modelCall(boardController.replyDel, req, res);
//   res.json(result)
// })
//파일다운로드*
router.get("/:bo_table/:filename/download", async (req,res)=>{
  const { bo_table, filename } = req.params;
  const config = await modelCall(boardController.getConfig, bo_table);
  const grant = isGrant(req, config.bo_download_level);
  if (!grant) {
    return res.status(403).end("No file download permission");
  }
  const { src } = req.query;
  const srcFile = `${UPLOAD_PATH}/${bo_table}/${src}`;
  if (!fs.existsSync(srcFile)) {
    return res.status(404).end("file not found");
  }
  res.download(srcFile, filename);
})


module.exports = router;
