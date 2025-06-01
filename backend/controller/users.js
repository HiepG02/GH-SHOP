const userModel = require("../models/users");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');

class User {
  async send_email(req, res) {
    const { email } = req.body;

    try {
      const user = await userModel.findOne({ email });
      if (!user) return res.status(404).json({ message: "Email không tồn tại." });

      // Tạo mã OTP và thời gian hết hạn
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

      user.otpCode = otp;
      user.otpExpires = otpExpires;
      await user.save();

      const transporter = await nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT, // Cổng của Mailtrap
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"App hỗ trợ" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Mã OTP đặt lại mật khẩu",
        text: `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 10 phút.`,
      });

      res.json({ message: "Mã OTP đã được gửi tới email của bạn." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi khi gửi OTP." });
    }
  }

  async change_password(req, res) {
    const { email, otp, newPassword } = req.body;

    try {
      const user = await userModel.findOne({ email });
      if (!user) return res.status(404).json({ message: "Email không tồn tại." });

      if (
        !user.otpCode ||
        user.otpCode !== otp ||
        !user.otpExpires ||
        new Date() > user.otpExpires
      ) {
        return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn." });
      }

      // Cập nhật mật khẩu mới
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.otpCode = null; // xóa OTP sau khi dùng
      user.otpExpires = null;
      await user.save();

      res.json({ message: "Mật khẩu đã được đổi thành công." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi khi đổi mật khẩu.", error: error });
    }
  }

  async getAllUser(req, res) {
    try {
      let Users = await userModel
        .find({})
        .populate("allProduct.id", "pName pImages pPrice")
        .populate("user", "name email")
        .sort({ _id: -1 });
      if (Users) {
        return res.json({ Users });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async getSingleUser(req, res) {
    let { uId } = req.body;
    if (!uId) {
      return res.json({ error: "Vui lòng điền đầy đủ thông tin !" });
    } else {
      try {
        let User = await userModel
          .findById(uId)
          .select("name email phoneNumber userImage updatedAt createdAt");
        if (User) {
          return res.json({ User });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  async postAddUser(req, res) {
    let { allProduct, user, amount, transactionId, address, phone } = req.body;
    if (
      !allProduct ||
      !user ||
      !amount ||
      !transactionId ||
      !address ||
      !phone
    ) {
      return res.json({ message: "Vui lòng điền đầy đủ thông tin !" });
    } else {
      try {
        let newUser = new userModel({
          allProduct,
          user,
          amount,
          transactionId,
          address,
          phone,
        });
        let save = await newUser.save();
        if (save) {
          return res.json({ success: "Người dùng đã được tạo thành công" });
        }
      } catch (err) {
        return res.json({ error: error });
      }
    }
  }

  async postEditUser(req, res) {
    let { uId, name, phoneNumber } = req.body;
    if (!uId || !name || !phoneNumber) {
      return res.json({ message: "Vui lòng điền đầy đủ thông tin !" });
    } else {
      let currentUser = userModel.findByIdAndUpdate(uId, {
        name: name,
        phoneNumber: phoneNumber,
        updatedAt: Date.now(),
      });
      currentUser.exec((err, result) => {
        if (err) console.log(err);
        return res.json({ success: "Người dùng đã cập nhật thành công" });
      });
    }
  }

  async postEditUser(req, res) {
    try {
      let { uId, name, phoneNumber } = req.body;
      if (!uId || !name || !phoneNumber) {
        return res.json({ message: "Vui lòng điền đầy đủ thông tin !" });
      }

      let updatedUser = await userModel.findByIdAndUpdate(
        uId,
        {
          name: name,
          phoneNumber: phoneNumber,
          updatedAt: Date.now(),
        },
        { new: true } // Trả về user đã cập nhật
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      return res.json({ success: "Người dùng đã cập nhật thành công", user: updatedUser });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
  }

  async getDeleteUser(req, res) {
    let { oId, status } = req.body;
    if (!oId || !status) {
      return res.json({ message: "Vui lòng điền đầy đủ thông tin !" });
    } else {
      let currentUser = userModel.findByIdAndUpdate(oId, {
        status: status,
        updatedAt: Date.now(),
      });
      currentUser.exec((err, result) => {
        if (err) console.log(err);
        return res.json({ success: "Người dùng đã cập nhật thành công" });
      });
    }
  }

  async changePassword(req, res) {
    let { uId, oldPassword, newPassword } = req.body;
    if (!uId || !oldPassword || !newPassword) {
      return res.json({ message: "Vui lòng điền đầy đủ thông tin !" });
    } else {
      const data = await userModel.findOne({ _id: uId });
      if (!data) {
        return res.json({
          error: "Người dùng không hợp lệ",
        });
      } else {
        const oldPassCheck = await bcrypt.compare(oldPassword, data.password);
        if (oldPassCheck) {
          newPassword = bcrypt.hashSync(newPassword, 10);
          let passChange = userModel.findByIdAndUpdate(uId, {
            password: newPassword,
          });
          passChange.exec((err, result) => {
            if (err) console.log(err);
            return res.json({ success: "Mật khẩu đã được cập nhật thành công" });
          });
        } else {
          return res.json({
            error: "Mật khẩu cũ của bạn sai!!",
          });
        }
      }
    }
  }
}

const ordersController = new User();
module.exports = ordersController;
