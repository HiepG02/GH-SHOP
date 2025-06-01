const express = require("express");
const router = express.Router();
const bannerController = require("../controller/banners");
const multer = require("multer");
const { loginCheck } = require("../middleware/auth");

// Image Upload setting
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/banners");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get("/all-banner-active", bannerController.getAllBannerActive);
router.get("/all-banner", bannerController.getAllCategory);
router.post(
  "/add-banner",
  loginCheck,
  upload.single("cImage"),
  bannerController.postAddCategory
);
router.post("/edit-banner", loginCheck, bannerController.postEditCategory);
router.post(
  "/delete-banner",
  loginCheck,
  bannerController.getDeleteCategory
);

module.exports = router;
