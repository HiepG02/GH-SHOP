const express = require("express");
const router = express.Router();
const productController = require("../controller/products");
const multer = require("multer");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/products");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get("/export-products", productController.exportProductsToExcel);
router.get("/all-product", productController.getAllProduct);
router.get("/all-product-by-rate", productController.getProductsSortedByRating);
router.get("/all-product-by-buy", productController.getTopSellingProducts);
router.get("/product-by-sale", productController.getTopSaleProducts);
router.post("/product-by-category", productController.getProductByCategory);
router.post("/product-by-price", productController.getProductByPrice);
router.post("/wish-product", productController.getWishProduct);
router.post("/cart-product", productController.getCartProduct);

router.post("/add-product", upload.any(), productController.postAddProduct);
router.post("/edit-product", upload.any(), productController.postEditProduct);
router.post("/delete-product", productController.getDeleteProduct);
router.post("/single-product", productController.getSingleProduct);

router.post("/add-review", productController.postAddReview);
router.post("/delete-review", productController.deleteReview);

router.get("/brands/:id", productController.getBrandWithProducts);

module.exports = router;
