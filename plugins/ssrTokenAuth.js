const memberController = require("../api/controller/memberController");
const jwt = require("./jwt");
module.exports = async (req, res, next) => {
  if (!req.user) {
    if (req.headers.token) {
      const user = jwt.verify(req.headers.token);
      if (user.err) return next();
      const { mb_id } = user;
      const member = await memberController.getMemberBy({ mb_id });
      req.user = member;
    }
  }
  next();
  //================>passport.app.use 동일하게 있어서 주석처리했음
};
