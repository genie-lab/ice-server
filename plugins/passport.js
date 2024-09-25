const Passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const jwt = require("./jwt");
const memberController = require("../api/controller/memberController");
const { LV } = require("../util/level");
const GoogleStrategy = require("passport-google-oauth2").Strategy;

const {
  CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  KAKAO_CLIENT_ID,
  KAKAO_CLIENT_SECRET,
  NAVER_CLIENT_ID,
  NAVER_CLIENT_SECRET,
} = $config.server;

// 로그인 정책
function loginRules(member) {
  if (member.mb_leave_at) {
    return "탈퇴회원입니다";
  }

  switch (member.mb_level) {
    case LV.BLOCK:
      "차단회원입니다";
      break;
    case LV.AWAIT:
      "대기입니다";
      break;
  }
}

const passport = function (app) {
  app.use(Passport.initialize());

  Passport.use(
    new LocalStrategy(
      { usernameField: "mb_id", passwordField: "mb_password" },

      async (mb_id, mb_password, done) => {
        try {
          mb_password = jwt.generatePassword(mb_password);
          const member = await memberController.listByWhere({
            mb_id,
            mb_password,
          });
          //로그인정책추가
          const msg = loginRules(member);
          // console.log("msg", msg);
          if (msg) {
            return done(null, null, msg); // 에러,member, info
          }
          return done(null, member);
        } catch (e) {
          console.log(e.message);
          return done(null, null, "아이디 또는 비밀번호가 올바르지 않습니다."); //에러, 리턴객체, info
        }
      }
    )
  );

  app.use(async (req, res, next) => {
    const token = req.cookies.token || req.headers.token; // 게시판에서 비회원이 headers에 토큰보냄
    // console.log("send to passport token", token);
    if (!token) return next();
    const { mb_id } = jwt.verify(token);
    try {
      if (mb_id) {
        const member = await memberController.listByWhere({ mb_id });
        //로그인정책추가
        const msg = loginRules(member);
        if (msg) {
          return next(); // 로그인 안시킴
        }
        req.login(member, { session: false }, (err) => {});
      }
    } catch (err) {
      console.log("auth err", err);
    }
    next();
  });

  //google
  Passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.CALLBACK_URL}/api/member/social-callback/google`,
        passReqToCallback: true,
      },
      async function (request, accessToken, refreshToken, profile, done) {
        console.log("profile.id", profile.id);
        //인증
        if (profile && profile.id) {
          const member = await memberController.loginGoogle(request, profile);
          const msg = loginRules(member);
          if (msg) {
            return done(msg, null, null);
          }
          return done(null, member); // err data
        } else {
          return done("로그인 실패", null);
        }
      }
    )
  );
};

module.exports = passport;
