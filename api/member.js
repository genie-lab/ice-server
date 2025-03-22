const app = require("express");
const router = app.Router();
const { modelCall, resData } = require("../util/lib");
const memberController = require("./controller/memberController");
const passport = require("passport");
const moment = require("../util/moment");
const jwt = require("../plugins/jwt");
const STATUS = require("../util/STATUS");
const uplpad = require("../util/uploadMulter");

//새로고침 멤버유지
router.post("/aliveCheck", async (req, res) => {
  if (req?.user) {
    const [result] = req.user;
    delete result.mb_password;
    res.json(result);
  } else {
  const data = await modelCall(memberController.loginMember, req); // 업데이트 이루어짐
  console.log('member data',data)
  if(data?.member){
    // 쿠키생성 클라 넣어줌
    res.cookie("token", data?.token, { 
      httpOnly: true,   // JavaScript에서 쿠키 접근 불가능 (보안 강화)
      // secure: true,     // HTTPS에서만 전송됨 (배포 환경에서는 true로 설정)
      // sameSite: 'Lax',  // 크로스사이트 요청 문제 방지 (필요 시 'None' 사용)
      maxAge: 7 * 24 * 60 * 60 * 1000  // 7일간 유지 (밀리초 단위)
     }); //클라에서 서버로 못옴
     console.log('>>>>>>>>>>>>>>>>>>>>> memeber : ', member, token);
    const result = { member, token };
    res.json(result);
  }
    res.json("로그인 사용자 아님");
  }
});
//추가
router.post("/add", uplpad("member").any(), async (req, res) => {
  const result = await modelCall(memberController.add, req);
  res.json(result);
});
//수정
router.put("/edit", uplpad("member").any(), async (req, res) => {
  const result = await modelCall(memberController.edit, req);
  res.json(result);
});
//삭제
router.put("/del", async (req, res) => {
  const result = await modelCall(memberController.del, req);
  res.json(result);
});
//중복검사
router.post("/duplCheck", async (req, res) => {
  const result = await modelCall(memberController.duplCheck, req);
  res.json(result);
});
//login
router.post("/loginLocal", async (req, res) => {
  console.log('login local',req.body);
  // 인증
  passport.authenticate("local", function (err, member, info) {
    console.log('passport member',member, info, err);
    // passport 안 done(내용들 , , ); 인증결과 받음
    if (info) {
      // 에러
      res.json(info);
    } else {
      // 인증승인
      //passport 문법
      req.login(member, { session: false }, async (err) => {
        console.log('member',member);

        // 싱글페이지라 session false처리 앞단에서 쿠키사용
        if (err) {
          console.log(err);
          const result = "저장에러 발생";
          res.json(result);
        } else {
          //토큰 가져오기
          const token = jwt.getToken(member); //member.mb_id 가져옴
          console.log('token : ', token);

          //로그인 업데이트 시간 업데이트
          try {
            const data = await memberController.loginMember(req); // 업데이트 이루어짐
            member.mb_login_at = data.mb_login_at;
            member.mb_login_ip = data.mb_login_ip;
            console.log('data : ', data);

            // 쿠키생성 클라 넣어줌
            res.cookie("token", token, { 
              httpOnly: true,   // JavaScript에서 쿠키 접근 불가능 (보안 강화)
              // secure: true,     // HTTPS에서만 전송됨 (배포 환경에서는 true로 설정)
              // sameSite: 'Lax',  // 크로스사이트 요청 문제 방지 (필요 시 'None' 사용)
              maxAge: 7 * 24 * 60 * 60 * 1000  // 7일간 유지 (밀리초 단위)
             }); //클라에서 서버로 못옴
             console.log('>>>>>>>>>>>>>>>>>>>>> memeber : ', member, token);
            const result = { member, token };
            res.json(result);
          } catch (error) {
            res.json({ error });
          }
        }
      }); // done함수 가져옴 // passport try 맞으면 member로 아니면 err
    }
  })(req, res); // 즉시실행함수 선언과 동시에 호출되어 반환 https://jongminfire.dev/java-script-%EC%A6%89%EC%8B%9C%EC%8B%A4%ED%96%89%ED%95%A8%EC%88%98-iife
});
//로그아웃
router.get("/logout", async (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
  });
  if (req.cookies["token"] !== undefined) {
    res.clearCookie("token");
  }
  res.redirect("/api/member/aliveCheck");
});
//탈퇴
router.post("/leave", async (req, res) => {
  const result = await modelCall(memberController.leave, req);
  res.json(result);
});
//아이디찾기
router.post("/findId", async (req, res) => {
  const result = await modelCall(memberController.findId, req); //name email
  res.json(result);
});
//비밀번호찾기
router.post("/findPw", async (req, res) => {
  const result = await modelCall(memberController.findPw, req); //req보내는 이유는 query 외 더 뽑으려고
  res.json(result); //mb_name
});
// 비밀번호수정
router.patch("/editPassword", async (req, res) => {
  const result = await modelCall(memberController.editPassword, req);
  res.json(result);
});
//전체목록수
router.get("/listCount", async (req, res) => {
  const result = await modelCall(memberController.listCount);
  res.json(result);
});
//회원목록
router.get("/list", async (req, res) => {
  const result = await modelCall(memberController.list, req);
  res.json(result);
});
//where절 목록
router.post("/listByWhere", async (req, res) => {
  const result = await modelCall(memberController.listByWhere, req);
  res.json(result);
});
//google login screen //https://console.cloud.google.com/apis/dashboard
router.get(
  "/loginGoogle",
  passport.authenticate("google", { scope: ["email", "profile"] })
);
//소셜로그인
router.get("/social-callback/:provider", (req, res) => {
  const { provider } = req.params;
  passport.authenticate(provider, async function (err, member) {
    const result = await modelCall(
      memberController.socialCallback,
      req,
      res,
      err,
      member
    );
    res.json(result);
  })(req, res);
});

module.exports = router;
