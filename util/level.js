const level = {
  LV: {
    BLOCK: 0, //로그인 처리 안함
    AWAIT: 1, //로그인 처리 안함
    MEMBER: 2,
    VIP: 4,
    ADMIN: 6,
    SUPER: 10,
  },
  LV_LABEL: (lv) => {
    if (lv >= level.LV.SUPER) {
      return "최고관리자";
    } else if (lv >= level.LV.ADMIN && lv < level.LV.SUPER) {
      return "관리자";
    } else if (lv >= level.LV.VIP && lv < level.LV.ADMIN) {
      return "우수회원";
    } else if (lv >= level.LV.MEMBER && lv < level.LV.VIP) {
      return "일반회원";
    } else if (lv == level.LV.AWAIT) {
      return "대기회원";
    } else {
      return "차단/비회원";
    }
  },

  LV_COLOR: (lv) => {
    if (lv >= level.LV.SUPER) {
      return "deep-purple lighten-4";
    } else if (lv >= level.LV.ADMIN && lv < level.LV.SUPER) {
      return "amber lighten-1";
    } else if (lv >= level.LV.VIP && lv < level.LV.ADMIN) {
      return "green lighten-4";
    } else if (lv >= level.LV.MEMBER && lv < level.LV.VIP) {
      return "lime lighten-3";
    } else if (lv == level.LV.AWAIT) {
      return "blue-grey lighten-4";
    } else {
      return "blue-grey lighten-4";
    }
  },

  isGrant(req, lv) {
    const grant = req.user ? req.user[0].mb_level : 0;
    return grant >= lv; // grant check
  },
};

module.exports = level;
