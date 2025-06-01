const productModel = require("../models/products");
const orderModel = require("../models/orders");
const fs = require("fs");
const path = require("path");
const brandModel = require("../models/brand");
const ExcelJS = require("exceljs");
const bannerModel = require("../models/banner");
const categoryModel = require("../models/categories");

class Product {
    async exportProductsToExcel(req, res) {
        try {
            const products = await productModel
                .find({})
                .populate("pCategory", "cName")
                .populate("brand_id", "cName");

            // Khởi tạo workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Danh sách sản phẩm");

            // Thiết lập header
            worksheet.columns = [
                { header: "STT", key: "index", width: 5 },
                { header: "Tên sản phẩm", key: "pName", width: 30 },
                { header: "Mô tả", key: "pDescription", width: 50 },
                { header: "Giá", key: "pPrice", width: 15 },
                { header: "Số lượng", key: "pQuantity", width: 10 },
                { header: "Danh mục", key: "pCategory", width: 20 },
                { header: "Thương hiệu", key: "brand_id", width: 20 },
                { header: "Trạng thái", key: "pStatus", width: 15 },
            ];

            // Style header
            worksheet.getRow(1).eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1E90FF' },
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            // Ghi dữ liệu
            products.forEach((product, index) => {
                worksheet.addRow({
                    index: index + 1,
                    pName: product.pName,
                    pDescription: product.pDescription,
                    pPrice: product.pPrice,
                    pQuantity: product.pQuantity,
                    pCategory: product.pCategory?.cName || "",
                    brand_id: product.brand_id?.cName || "",
                    pStatus: product.pStatus,
                });
            });

            // Tạo thư mục nếu chưa tồn tại
            const exportDir = path.join(__dirname, "../public/exports");
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }

            // Tạo tên file
            const fileName = `products_${Date.now()}.xlsx`;
            const filePath = path.join(exportDir, fileName);

            // Lưu file
            await workbook.xlsx.writeFile(filePath);

            // Trả về đường dẫn tải
            const downloadLink = `/exports/${fileName}`;
            const fullUrl = `${req.protocol}://${req.get("host")}${downloadLink}`;
            return res.json({ success: true, download: downloadLink, fullUrl: fullUrl });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ error: "Xuất file thất bại" });
        }
    }

    // Delete Image from uploads -> products folder
    static deleteImages(images, mode) {
        var basePath =
            path.resolve(__dirname + "../../") + "/public/uploads/products/";
        console.log(basePath);
        for (var i = 0; i < images.length; i++) {
            let filePath = "";
            if (mode == "file") {
                filePath = basePath + `${images[i].filename}`;
            } else {
                filePath = basePath + `${images[i]}`;
            }
            console.log(filePath);
            if (fs.existsSync(filePath)) {
                console.log("Exists image");
            }
            fs.unlink(filePath, (err) => {
                if (err) {
                    return err;
                }
            });
        }
    }

    async getAllProduct(req, res) {
        try {
            let Products = await productModel
                .find({})
                .populate("pCategory", "_id cName")
                .populate(
                    "brand_id",
                    "_id cName cDescription avatar view cStatus"
                )
                .sort({ _id: -1 });
            if (Products) {
                return res.json({ Products });
            }
        } catch (err) {
            console.log(err);
        }
    }

    async getTopSellingProducts(req, res) {
        let limit = 10
        const result = await orderModel.aggregate([
            { $unwind: "$allProduct" },
            {
                $group: {
                    _id: "$allProduct.id",
                    totalSold: { $sum: "$allProduct.quantitiy" },
                },
            },
            {
                $sort: { totalSold: -1 },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            { $unwind: "$productInfo" },
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    totalSold: 1,
                    pName: "$productInfo.pName",
                    pPrice: "$productInfo.pPrice",
                    pImages: "$productInfo.pImages",
                },
            },
            { $limit: limit }, // Lấy top N sản phẩm
        ]);

        // return result;
        return res.json({ success: true, Products: result, });
    }


    async getProductsSortedByRating(req, res) {
        try {
            const products = await productModel.aggregate([
                {
                    $addFields: {
                        avgRating: {
                            $avg: {
                                $map: {
                                    input: "$pRatingsReviews",
                                    as: "review",
                                    in: { $toDouble: "$$review.rating" },
                                },
                            },
                        },
                        numReviews: { $size: "$pRatingsReviews" } // Đếm số lượng đánh giá
                    },
                },
                {
                    $match: {
                        numReviews: { $gt: 0 }, // Chỉ lấy sản phẩm có ít nhất 1 đánh giá
                    },
                },
                {
                    $sort: { numReviews: -1 }, // Sắp xếp theo số lượt đánh giá giảm dần
                },
            ]);

            if (products.length > 0) {
                return res.json({ Products: products });
            } else {
                return res.json({ Products: [] });
            }
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: "Đã có lỗi xảy ra khi lấy danh sách sản phẩm" });
        }
    }

    // async getProductsSortedByRating(req, res) {
    //     try {
    //         // Lọc sản phẩm có đánh giá (không tính sản phẩm không có đánh giá)
    //         const products = await productModel.aggregate([
    //             {
    //                 $addFields: {
    //                     avgRating: {
    //                         $avg: {
    //                             $map: {
    //                                 input: "$pRatingsReviews", // Lấy tất cả các đánh giá
    //                                 as: "review", // Đặt tên cho từng phần tử trong mảng
    //                                 in: { $toDouble: "$$review.rating" }, // Ép kiểu rating thành số thực
    //                             },
    //                         },
    //                     },
    //                 },
    //             },
    //             {
    //                 $match: {
    //                     avgRating: { $gt: 0 }, // Lọc những sản phẩm có avgRating > 0
    //                 },
    //             },
    //             {
    //                 $sort: { avgRating: -1 }, // Sắp xếp theo avgRating giảm dần
    //             },
    //         ]);

    //         if (products.length > 0) {
    //             return res.json({ Products: products });
    //         } else {
    //             return res.json({ Products: [] });
    //         }
    //     } catch (err) {
    //         console.log(err);
    //         res.status(500).json({ message: "Đã có lỗi xảy ra khi lấy danh sách sản phẩm" });
    //     }
    // }
    async getTopSaleProducts(req, res) {
        try {
            const products = await productModel.aggregate([
                {
                    $addFields: {
                        // avgRating: {
                        //     $avg: {
                        //         $map: {
                        //             input: "$pRatingsReviews",
                        //             as: "review",
                        //             in: { $toDouble: "$$review.rating" },
                        //         },
                        //     },
                        // },
                        numReviews: { $size: "$pRatingsReviews" },
                        numericOffer: { $toDouble: "$pOffer" } // chuyển đổi pOffer sang số
                    },
                },
                {
                    $match: {
                        //numReviews: { $gt: 0 },
                        numericOffer: { $gt: 0, $lt: 100 } // lọc pOffer > 0 && < 100
                    },
                },
                {
                    $sort: { numReviews: -1 },
                },
            ]);

            return res.json({ Products: products });
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: "Đã có lỗi xảy ra khi lấy danh sách sản phẩm" });
        }
    }


    async postAddProduct(req, res) {
        let {
            pName,
            pDescription,
            pPrice,
            pQuantity,
            pCategory,
            brand_id,
            pOffer,
            pStatus,
            pSizes,
        } = req.body;

        let images = req.files;

        // Validation
        if (
            !pName ||
            !pDescription ||
            !pPrice ||
            !pQuantity ||
            !brand_id ||
            !pCategory ||
            !pOffer ||
            !pStatus
        ) {
            Product.deleteImages(images, "file");
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else if (pName.length > 255 || pDescription.length > 3000) {
            Product.deleteImages(images, "file");
            return res.json({
                error: "Tên tối đa 255 ký tự & Mô tả tối đa 3000 ký tựs",
            });
        } else if (images.length !== 2) {
            Product.deleteImages(images, "file");
            return res.json({ error: "Phải cung cấp chính xác 2 hình ảnh" });
        } else {
            // Kiểm tra tên file trùng lặp
            let fileNames = images.map(img => img.filename);
            let uniqueFileNames = new Set(fileNames);

            if (uniqueFileNames.size !== fileNames.length) {
                Product.deleteImages(images, "file");
                return res.json({ error: "Không được phép sao chép hình ảnh" });
            }

            try {
                if (typeof pSizes === 'string') {
                    pSizes = pSizes.split(',').map(item => item.trim());
                }
                let newProduct = new productModel({
                    pImages: [...uniqueFileNames],
                    pName,
                    pDescription,
                    pPrice,
                    pQuantity,
                    pCategory,
                    pOffer,
                    pStatus,
                    brand_id,
                    pSizes,
                });

                let save = await newProduct.save();
                if (save) {
                    return res.json({
                        success: "Sản phẩm đã được tạo thành công",
                    });
                }
            } catch (err) {
                console.log(err);
                return res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
            }
        }
    }


    async getBrandWithProducts(req, res) {
        try {
            const { id } = req.params;

            // Lấy thông tin brand
            const brand = await brandModel.findById(id);
            if (!brand) {
                return res.status(404).json({ message: "Không tìm thấy thương hiệu" });
            }

            // Lấy danh sách sản phẩm thuộc brand này
            const products = await productModel.find({ brand_id: id });
            const banners = await bannerModel.find({ brand_id: id });
            const categories = await categoryModel.find({ brand_id: id });

            return res.json({
                brand,
                products,
                banners,
                categories,
            });
        } catch (error) {
            return res.status(500).json({ message: "Lỗi máy chủ nội bộ", error: error.message });
        }
    }


    async postEditProduct(req, res) {
        let {
            pId,
            pName,
            pDescription,
            pPrice,
            pQuantity,
            pCategory,
            pOffer,
            pStatus,
            pImages,
            brand_id,
            pSizes,
        } = req.body;
        let editImages = req.files;

        // Validate other fileds
        if (
            !pId |
            !pName |
            !pDescription |
            !brand_id |
            !pPrice |
            !pQuantity |
            !pCategory |
            !pOffer |
            !pStatus
        ) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        }
        // Validate Name and description
        else if (pName.length > 255 || pDescription.length > 3000) {
            return res.json({
                error: "Tên 255 & Mô tả không được dài quá 3000 ký tự",
            });
        }
        // Validate Update Images
        else if (editImages && editImages.length == 1) {
            Product.deleteImages(editImages, "file");
            return res.json({ error: "Phải cung cấp 2 hình ảnh" });
        } else {
            if (typeof pSizes === 'string') {
                pSizes = pSizes.split(',').map(item => item.trim());
            }
            let editData = {
                pName,
                pDescription,
                pPrice,
                pQuantity,
                pCategory,
                pOffer,
                pStatus,
                brand_id,
                pSizes,
            };
            if (editImages.length == 2) {
                let allEditImages = [];
                for (const img of editImages) {
                    allEditImages.push(img.filename);
                }
                editData = { ...editData, pImages: allEditImages };
                Product.deleteImages(pImages.split(","), "string");
            }
            try {
                let editProduct = productModel.findByIdAndUpdate(pId, editData);
                editProduct.exec((err) => {
                    if (err) console.log(err);
                    return res.json({ success: "Đã cập nhật sản phẩm thành công" });
                });
            } catch (err) {
                console.log(err);
            }
        }
    }

    async getDeleteProduct(req, res) {
        let { pId } = req.body;
        if (!pId) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            try {
                let deleteProductObj = await productModel.findById(pId);
                let deleteProduct = await productModel.findByIdAndDelete(pId);
                if (deleteProduct) {
                    // Delete Image from uploads -> products folder
                    Product.deleteImages(deleteProductObj.pImages, "string");
                    return res.json({
                        success: "Product deleted successfully",
                    });
                }
            } catch (err) {
                console.log(err);
            }
        }
    }

    async getSingleProduct(req, res) {
        let { pId } = req.body;
        if (!pId) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            try {
                let singleProduct = await productModel
                    .findById(pId)
                    .populate("pCategory", "cName")
                    .populate(
                        "brand_id",
                        "_id cName cDescription avatar view cStatus"
                    )
                    .populate("pRatingsReviews.user", "name email userImage");
                if (singleProduct) {
                    return res.json({ Product: singleProduct });
                }
            } catch (err) {
                console.log(err);
            }
        }
    }

    async getProductByCategory(req, res) {
        let { catId } = req.body;
        if (!catId) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            try {
                let products = await productModel
                    .find({ pCategory: catId })
                    .populate("pCategory", "cName");
                if (products) {
                    return res.json({ Products: products });
                }
            } catch (err) {
                return res.json({ error: "Search product wrong" });
            }
        }
    }

    async getProductByPrice(req, res) {
        let { price } = req.body;
        if (!price) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            try {
                let products = await productModel
                    .find({ pPrice: { $lt: price } })
                    .populate("pCategory", "cName")
                    .sort({ pPrice: -1 });
                if (products) {
                    return res.json({ Products: products });
                }
            } catch (err) {
                return res.json({ error: "Filter product wrong" });
            }
        }
    }

    async getWishProduct(req, res) {
        let { productArray } = req.body;
        if (!productArray) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            try {
                let wishProducts = await productModel.find({
                    _id: { $in: productArray },
                });
                if (wishProducts) {
                    return res.json({ Products: wishProducts });
                }
            } catch (err) {
                return res.json({ error: "Filter product wrong" });
            }
        }
    }

    async getCartProduct(req, res) {
        let { productArray } = req.body;
        if (!productArray) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            try {
                let cartProducts = await productModel.find({
                    _id: { $in: productArray },
                });
                if (cartProducts) {
                    return res.json({ Products: cartProducts });
                }
            } catch (err) {
                return res.json({ error: "Cart product wrong" });
            }
        }
    }

    async postAddReview(req, res) {
        let { pId, uId, rating, review } = req.body;
        if (!pId || !rating || !review || !uId) {
            return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            let checkReviewRatingExists = await productModel.findOne({
                _id: pId,
            });
            if (checkReviewRatingExists.pRatingsReviews.length > 0) {
                checkReviewRatingExists.pRatingsReviews.map((item) => {
                    if (item.user === uId) {
                        return res.json({
                            error: "Bạn đã đánh giá sản phẩm",
                        });
                    } else {
                        try {
                            let newRatingReview =
                                productModel.findByIdAndUpdate(pId, {
                                    $push: {
                                        pRatingsReviews: {
                                            review: review,
                                            user: uId,
                                            rating: rating,
                                        },
                                    },
                                });
                            newRatingReview.exec((err, result) => {
                                if (err) {
                                    console.log(err);
                                }
                                return res.json({
                                    success: "Cảm ơn bạn đã đánh giá",
                                });
                            });
                        } catch (err) {
                            return res.json({ error: "Giỏ hàng sản phẩm sai" });
                        }
                    }
                });
            } else {
                try {
                    let newRatingReview = productModel.findByIdAndUpdate(pId, {
                        $push: {
                            pRatingsReviews: {
                                review: review,
                                user: uId,
                                rating: rating,
                            },
                        },
                    });
                    newRatingReview.exec((err, result) => {
                        if (err) {
                            console.log(err);
                        }
                        return res.json({ success: "Cảm ơn bạn đã đánh giá" });
                    });
                } catch (err) {
                    return res.json({ error: "Giỏ hàng sản phẩm sai" });
                }
            }
        }
    }

    async deleteReview(req, res) {
        let { rId, pId } = req.body;
        if (!rId) {
            return res.json({ message: "Vui lòng điền đầy đủ thông tin !" });
        } else {
            try {
                let reviewDelete = productModel.findByIdAndUpdate(pId, {
                    $pull: { pRatingsReviews: { _id: rId } },
                });
                reviewDelete.exec((err, result) => {
                    if (err) {
                        console.log(err);
                    }
                    return res.json({ success: "Đánh giá của bạn đã bị xóa" });
                });
            } catch (err) {
                console.log(err);
            }
        }
    }
}

const productController = new Product();
module.exports = productController;
