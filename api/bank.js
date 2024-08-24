const router = require("express").Router();
const bankController = require("./controller/bankController");

router.get("/listCount", async (req, res) => {
  const result = await bankController.listCount();
  res.json(result);
});
router.get("/list", async (req, res) => {
  const result = await bankController.list();
  res.json(result);
});

router.post("/add", async (req, res) => {
  res.json();
});

module.exports = router;
