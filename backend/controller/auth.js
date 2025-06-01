const { toTitleCase, validateEmail } = require("../config/function");
const bcrypt = require("bcryptjs");
const userModel = require("../models/users");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/keys");
const axios = require("axios");

class Auth {
  async isAdmin(req, res) {
    let { loggedInUserId } = req.body;
    try {
      let loggedInUserRole = await userModel.findById(loggedInUserId);
      res.json({ role: loggedInUserRole.userRole });
    } catch {
      res.status(404);
    }
  }

  async allUser(req, res) {
    try {
      let allUser = await userModel.find({});
      res.json({ users: allUser });
    } catch {
      res.status(404);
    }
  }

  /* User Registration/Signup controller  */
  async postSignup(req, res) {
    let { name, email, password, cPassword } = req.body;
    let error = {};
    if (!name || !email || !password || !cPassword) {
      error = {
        ...error,
        name: "Không được để trống",
        email: "Không được để trống",
        password: "Không được để trống",
        cPassword: "Không được để trống",
      };
      return res.json({ error });
    }
    if (name.length < 3 || name.length > 25) {
      error = { ...error, name: "Tên phải dài từ 3-25 ký tự" };
      return res.json({ error });
    } else {
      if (validateEmail(email)) {
        name = toTitleCase(name);
        if ((password.length > 255) | (password.length < 8)) {
          error = {
            ...error,
            password: "Mật khẩu phải có 8 ký tự",
            name: "",
            email: "",
          };
          return res.json({ error });
        } else {
          // If Email & Number exists in Database then:
          try {
            password = bcrypt.hashSync(password, 10);
            const data = await userModel.findOne({ email: email });
            if (data) {
              error = {
                ...error,
                password: "",
                name: "",
                email: "Email đã tồn tại",
              };
              return res.json({ error });
            } else {
              let newUser = new userModel({
                name,
                email,
                password,
                // ========= Here role 1 for admin signup role 0 for customer signup =========
                userRole: 0, // Field Name change to userRole from role
              });
              newUser
                .save()
                .then((data) => {
                  return res.json({
                    success: "Tạo tài khoản thành công. Vui lòng đăng nhập",
                  });
                })
                .catch((err) => {
                  console.log(err);
                });
            }
          } catch (err) {
            console.log(err);
          }
        }
      } else {
        error = {
          ...error,
          password: "",
          name: "",
          email: "Email không hợp lệ",
        };
        return res.json({ error });
      }
    }
  }

  async login_google(req, res) {
    const { tokenId } = req.body;

    try {
      // Gọi API của Google để xác minh token ID
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${tokenId}`
      );

      const { sub: googleId, email, name } = response.data;

      // Kiểm tra xem người dùng đã tồn tại chưa
      let user = await userModel.findOne({ email });

      if (!user) {
        // Tạo tài khoản mới nếu chưa tồn tại
        user = new userModel({
          googleId,
          email,
          name,
          password: bcrypt.hashSync('123abcxyz', 10),
          userRole: 0,
        });
        await user.save();
      }

      // Tạo JWT
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: "100h",
      });
      const user_data = await userModel.findById(user._id).select("-password");
      // Trả về token cho frontend
      res.json({  token: token, user: user_data });
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(400).json({ success: false, message: "Xác thực thất bại" });
    }
  }

  /* User Login/Signin controller  */
  async postSignin(req, res) {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.json({
        error: "Vui lòng điền đầy đủ thông tin !",
      });
    }
    try {
      const data = await userModel.findOne({ email: email });
      if (!data) {
        return res.json({
          error: "Email hoặc mật khẩu không hợp lệ",
        });
      } else {
        const login = await bcrypt.compare(password, data.password);
        if (login) {
          const token = jwt.sign(
            { _id: data._id, role: data.userRole },
            JWT_SECRET
          );
          const encode = jwt.verify(token, JWT_SECRET);
          const user = await userModel.findById(encode._id).select("-password");
          return res.json({
            token: token,
            user: user,
          });
        } else {
          return res.json({
            error: "Email hoặc mật khẩu không hợp lệ",
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
}

const authController = new Auth();
module.exports = authController;
