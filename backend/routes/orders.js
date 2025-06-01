const express = require("express");
const router = express.Router();
const ordersController = require("../controller/orders");
const multer = require("multer");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/orders");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get("/export-excel", ordersController.exportOrdersToExcel);

router.get("/create_payment_url", ordersController.create_payment_url);
router.get("/vnpay_return", ordersController.vnpay_return);

router.get("/get-all-orders", ordersController.getAllOrders);
router.post("/order-by-user", ordersController.getOrderByUser);

router.post("/create-order", ordersController.postCreateOrder);
router.post("/update-order", ordersController.postUpdateOrder);
router.post("/update-payment-order", ordersController.postUpdatePaymentOrder);
router.post("/delete-order", ordersController.postDeleteOrder);
router.post("/upload-orders", upload.single("file"), ordersController.postUp);
router.post("/uploadStock", upload.single("file"), ordersController.uploadStock);

module.exports = router;
