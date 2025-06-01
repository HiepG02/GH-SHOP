const express = require("express");
const router = express.Router();
const brandController = require("../controller/brand");
const multer = require("multer");
const { loginCheck } = require("../middleware/auth");

// Image Upload setting
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/brands");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get("/all-brands", brandController.getAllBrands);

router.post(
  "/add-brand",
  loginCheck,
  upload.single("cImage"),
  brandController.postAddBrabd
);

router.post("/edit-brand", loginCheck, brandController.postEditBrands);

router.post(
  "/delete-brand",
  loginCheck,
  brandController.getDeleteBrands
);

module.exports = router;
