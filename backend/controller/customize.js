const fs = require("fs");
const categoryModel = require("../models/categories");
const productModel = require("../models/products");
const orderModel = require("../models/orders");
const userModel = require("../models/users");
const customizeModel = require("../models/customize");

class Customize {
  async getImages(req, res) {
    try {
      let Images = await customizeModel.find({});
      if (Images) {
        return res.json({ Images });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async uploadSlideImage(req, res) {
    let image = req.file.filename;
    if (!image) {
      return res.json({ error: "All field required" });
    }
    try {
      let newCustomzie = new customizeModel({
        slideImage: image,
      });
      let save = await newCustomzie.save();
      if (save) {
        return res.json({ success: "Image upload successfully" });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async deleteSlideImage(req, res) {
    let { id } = req.body;
    if (!id) {
      return res.json({ error: "All field required" });
    } else {
      try {
        let deletedSlideImage = await customizeModel.findById(id);
        const filePath = `../server/public/uploads/customize/${deletedSlideImage.slideImage}`;

        let deleteImage = await customizeModel.findByIdAndDelete(id);
        if (deleteImage) {
          // Delete Image from uploads -> customizes folder
          fs.unlink(filePath, (err) => {
            if (err) {
              console.log(err);
            }
            return res.json({ success: "Image deleted successfully" });
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  async getAllData(req, res) {
    try {
      let Categories = await categoryModel.find({}).count();
      let Products = await productModel.find({}).count();
      let Orders = await orderModel.find({}).count();
      let Users = await userModel.find({}).count();

      const today = new Date();
      const dates = [];

      // Tạo mảng 7 ngày gần nhất (yyyy-mm-dd)
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const formatted = date.toISOString().split("T")[0];
        dates.push(formatted);
      }

      const raw = await orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            status_payment: "Successful payment",
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]);

      const revenueMap = {};
      raw.forEach(item => {
        revenueMap[item._id] = item.totalRevenue;
      });

      const result_7day = dates.map(date => ({
        date,
        totalRevenue: revenueMap[date] || 0,
      }));

      const now = new Date();
      const months = [];

      // Tạo mảng 12 tháng gần nhất dưới dạng "yyyy-MM"
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        months.push(`${year}-${month}`);
      }

      const raw1 = await orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
            },
            status_payment: "Successful payment",
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]);

      const revenueMap1 = {};
      raw1.forEach(item => {
        const year = item._id.year;
        const month = String(item._id.month).padStart(2, "0");
        revenueMap1[`${year}-${month}`] = item.totalRevenue;
      });

      const result_12month = months.map(month => ({
        month,
        totalRevenue: revenueMap1[month] || 0,
      }));


      // const result_12month 

      if (Categories && Products && Orders) {
        return res.json({ Categories, Products, Orders, Users, result_7day, result_12month });
      }
    } catch (err) {
      console.log(err);
    }
  }
}

const customizeController = new Customize();
module.exports = customizeController;
