const { toTitleCase } = require("../config/function");
const categoryModel = require("../models/categories");
const bannerModel = require("../models/banner");
const fs = require("fs");

class Banner {
  async getAllBannerActive(req, res) {
    try {
      // Lọc theo status là 'Active' và sắp xếp theo _id giảm dần
      let Banners = await bannerModel.find({ cStatus: 'Active' }).sort({ _id: -1 }).limit(6);
  
      if (Banners) {
        return res.json({ Banners });
      } else {
        return res.status(404).json({ message: "Không có banner nào đang hoaatj động " });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Đã có lỗi xảy ra khi lấy danh sách banner" });
    }
  }

  async getAllCategory(req, res) {
    try {
      let Banners = await bannerModel.find({}).sort({ _id: -1 });
      if (Banners) {
        return res.json({ Banners });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async postAddCategory(req, res) {
    let { cStatus ,brand_id } = req.body;
    let cImage = req.file.filename;
    const filePath = `../backend/public/uploads/banners/${cImage}`;

    console.log(filePath)

    if (!cStatus || !cImage) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
        }
        return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
      });
    } else {
      // cName = toTitleCase(cName);
      try {
        // let checkCategoryExists = await bannerModel.findOne({ cName: cName });
        // if (checkCategoryExists) {
        //   fs.unlink(filePath, (err) => {
        //     if (err) {
        //       console.log(err);
        //     }
        //     return res.json({ error: "Banner already exists" });
        //   });
        // } else {
          let newCategory = new bannerModel({
            brand_id,
            cStatus,
            image: cImage,
          });
          await newCategory.save((err) => {
            if (!err) {
              return res.json({ success: "Banner đã được tạo thành công" });
            }
          });
        // }
      } catch (err) {
        console.log(err);
      }
    }
  }

  async postEditCategory(req, res) {
    let { cId, cStatus } = req.body;
    if (!cId || !cStatus) {
      return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
    }
    try {
      let editCategory = bannerModel.findByIdAndUpdate(cId, {
        // cDescription,
        cStatus,
        updatedAt: Date.now(),
      });
      let edit = await editCategory.exec();
      if (edit) {
        return res.json({ success: "Chỉnh sửa banner thành công" });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async getDeleteCategory(req, res) {
    let { cId } = req.body;
    if (!cId) {
      return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
    } else {
      try {
        let deletedCategoryFile = await bannerModel.findById(cId);
        const filePath = `../backend/public/uploads/banner/${deletedCategoryFile.image}`;

        let deleteCategory = await bannerModel.findByIdAndDelete(cId);
        if (deleteCategory) {
          // Delete Image from uploads -> categories folder 
          fs.unlink(filePath, (err) => {
            if (err) {
              console.log(err);
            }
            return res.json({ success: "Xóa banner thành công" });
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }
}

const bannerController = new Banner();
module.exports = bannerController;
