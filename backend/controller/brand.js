const { toTitleCase } = require("../config/function");
const categoryModel = require("../models/categories");
const brandModel = require("../models/brand");
const fs = require("fs");

class Category {
  async getAllBrands(req, res) {
    try {
      let brands = await brandModel.find({}).sort({ _id: -1 });
      if (brands) {
        return res.json({ brands });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async postAddBrabd(req, res) {
    let { cName, cDescription, cStatus } = req.body;
    let cImage = req.file.filename;
    const filePath = `../backend/public/uploads/brands/${cImage}`;

    if (!cName || !cDescription || !cStatus || !cImage) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
        }
        return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
      });
    } else {
      cName = toTitleCase(cName);
      try {
        let checkCategoryExists = await brandModel.findOne({ cName: cName });
        if (checkCategoryExists) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.log(err);
            }
            return res.json({ error: "Thương hiệu đã tồn tại " });
          });
        } else {
            var avatar = cImage;
          let newCategory = new brandModel({
            cName,
            cDescription,
            cStatus,
            avatar,
          });
          await newCategory.save((err) => {
            if (!err) {
              return res.json({ success: "Tạo thành công thương hiệu " });
            }
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  async postEditBrands(req, res) {
    let { cId, cDescription, cStatus } = req.body;
    if (!cId || !cDescription || !cStatus) {
      return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
    }
    try {
      let editCategory = brandModel.findByIdAndUpdate(cId, {
        cDescription,
        cStatus,
        updatedAt: Date.now(),
      });
      let edit = await editCategory.exec();
      if (edit) {
        return res.json({ success: "Sửa thương hiệu thành công " });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async getDeleteBrands(req, res) {
    let { cId } = req.body;
    if (!cId) {
      return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
    } else {
      try {
        let deletedCategoryFile = await brandModel.findById(cId);
        const filePath = `../backend/public/uploads/categories/${deletedCategoryFile.cImage}`;

        let deleteCategory = await brandModel.findByIdAndDelete(cId);
        if (deleteCategory) {
          // Delete Image from uploads -> categories folder 
          fs.unlink(filePath, (err) => {
            if (err) {
              console.log(err);
            }
            return res.json({ success: "Xóa thương hiệu thành công s" });
          });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }
}

const categoryController = new Category();
module.exports = categoryController;
