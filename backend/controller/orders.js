const orderModel = require("../models/orders");
const productModel = require("../models/products");
const StockTransaction = require("../models/stockTransactionModel");
const userModel = require("../models/users");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
const moment = require('moment');
const crypto = require("crypto");
const qs = require("qs");
require("dotenv").config();


const vnp_TmnCode = process.env.VNP_TMNCODE;
const vnp_HashSecret = process.env.VNP_HASHSECRET;
const vnp_Url = process.env.VNP_URL;
const vnp_ReturnUrl = process.env.VNP_RETURNURL;
const VNP_REDIRECT = process.env.VNP_REDIRECT;


class Order {
  async exportOrdersToExcel(req, res) {
    try {
      const orders = await orderModel
        .find({})
        .populate("allProduct.id", "pName")
        .populate("user", "name email");

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "Không có đơn hàng để xuất" });
      }

      // Chuẩn bị dữ liệu cho Excel
      const data = orders.map((order) => {
        const products = order.allProduct
          .map((p) => `${p.id?.pName || "N/A"} (SL: ${p.quantitiy})`)
          .join(", ");

        return {
          "Mã đơn hàng": order._id.toString(),
          "Tên khách hàng": order.user?.name || "N/A",
          "Email khách hàng": order.user?.email || "N/A",
          "Sản phẩm": products,
          "Tổng tiền (VNĐ)": order.amount,
          "Địa chỉ": order.address,
          "Số điện thoại": order.phone,
          "Ngày tạo": moment(order.createdAt).format("DD/MM/YYYY HH:mm"),
        };
      });

      // Tạo workbook và worksheet
      const workbook = xlsx.utils.book_new();

      // Dòng tiêu đề đầu tiên
      const title = [[`Danh sách đơn hàng - Ngày xuất: ${moment().format("DD/MM/YYYY")}`]];
      const header = [
        "Mã đơn hàng",
        "Tên khách hàng",
        "Email khách hàng",
        "Sản phẩm",
        "Tổng tiền (VNĐ)",
        "Địa chỉ",
        "Số điện thoại",
        "Ngày tạo"
      ];

      // Thêm dữ liệu vào sheet
      const worksheetData = [
        ...title,  // Thêm tiêu đề đầu tiên
        [],  // Dòng trống giữa tiêu đề và dữ liệu
        header,
        ...data.map((item) => Object.values(item)), // Chuyển đổi data thành array
      ];

      // Tạo sheet từ dữ liệu
      const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

      // Tăng chiều rộng các cột
      const colWidths = [
        { wch: 30 }, // Mã đơn hàng
        { wch: 25 }, // Tên khách hàng
        { wch: 30 }, // Email
        { wch: 50 }, // Sản phẩm
        { wch: 20 }, // Tổng tiền
        { wch: 40 }, // Địa chỉ
        { wch: 20 }, // SĐT
        { wch: 25 }, // Ngày tạo
      ];
      worksheet["!cols"] = colWidths;

      // Ghi sheet vào workbook
      xlsx.utils.book_append_sheet(workbook, worksheet, "Orders");

      // Tạo thư mục nếu chưa có
      const filePath = path.join(__dirname, "../public/exports/orders.xlsx");
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Ghi file
      xlsx.writeFile(workbook, filePath);

      // Trả về URL tải file
      const fileUrl = `${req.protocol}://${req.get("host")}/exports/orders.xlsx`;
      res.json({ success: true, url: fileUrl });
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);
      res.status(500).json({ message: "Lỗi xuất Excel" });
    }
  }

  async getAllOrders(req, res) {
    try {
      let Orders = await orderModel
        .find({})
        .populate("allProduct.id", "pName pImages pPrice")
        .populate("user", "name email")
        .sort({ _id: -1 });
      if (Orders) {
        return res.json({ Orders });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async postUp(req, res) {
    try {
      // console.log(req.file)
      if (!req.file) {
        return res.status(400).json({ error: "Vui lòng tải lên file Excel" });
      }

      const filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Chuyển đổi dữ liệu từ Excel thành JSON, bắt đầu từ dòng 4
      const rawData = xlsx.utils.sheet_to_json(sheet, { range: 3 });

      if (rawData.length === 0) {
        return res.status(400).json({ error: "Không có dữ liệu hợp lệ trong file" });
      }

      const orders = [];

      for (const row of rawData) {
        const { "Tên sản phẩm": productName, "Địa chỉ": address, "Số điện thoại": phone, "Số lượng mua": quantity, "Email user mua": email, "Mã đơn hàng": orderId } = row;

        if (!productName || !address || !phone || !quantity || !email || !orderId) {
          continue;
        }

        // Tìm sản phẩm
        const product = await productModel.findOne({ pName: productName });
        if (!product) {
          console.log(`Không tìm thấy sản phẩm: ${productName}`);
          continue;
        }

        // Tìm user
        const user = await userModel.findOne({ email });
        if (!user) {
          console.log(`Không tìm thấy user: ${email}`);
          continue;
        }

        // Tạo đơn hàng
        const newOrder = new orderModel({
          allProduct: [{ id: product._id, quantitiy: quantity }],
          user: user._id,
          amount: product.pPrice * quantity,
          transactionId: orderId,
          address,
          phone,
          guarantee: new Date(new Date().setFullYear(new Date().getFullYear() + 5)), // Bảo hành 5 năm
        });

        const savedOrder = await newOrder.save();
        orders.push(savedOrder);

        await savedOrder.populate("allProduct.id").populate("user").execPopulate();
        const userEmail = savedOrder.user.email;

        const doc = new PDFDocument();
        const fontPath = path.join(__dirname, "../fonts/Roboto-Regular.ttf");
        doc.registerFont("Roboto", fontPath);
        doc.font("Roboto");
        const fileName = `invoice_${savedOrder._id}.pdf`;
        const filePath = path.join(__dirname, "../public/invoices", fileName);

        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        let responseSent = false;
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Nội dung hóa đơn
        doc.fontSize(22).text("Hóa đơn mua hàng", { align: "center" }).moveDown();
        doc.fontSize(12).text(`Mã đơn: ${savedOrder._id}`);
        doc.text(`Email: ${userEmail}`);
        // doc.text(`Transaction ID: ${save.transactionId}`);
        doc.text(`Tổng số tiền: ${savedOrder.amount} VNĐ`);
        doc.text(`Địa chỉ giao hàng: ${savedOrder.address}`);
        doc.text(`Số điện thoại: ${savedOrder.phone}`).moveDown();

        doc.text("Sản phẩm đặt:", { underline: true });
        savedOrder.allProduct.forEach((product, index) => {
          const productName = product.id?.pName || "Unknown";
          doc.text(`${index + 1}. Product : ${productName}, Số lượng: ${product.quantitiy}`);
        });
        doc.text(``).moveDown();
        doc.text(`Cảm ơn quá khách đã mua hàng!`);
        doc.end();

        writeStream.on("finish", async () => {
          if (!responseSent) {
            responseSent = true;
            savedOrder.pdf_bill = `/public/invoices/${fileName}`;
            await savedOrder.save();

            const transporter = await nodemailer.createTransport({
              host: process.env.MAIL_HOST,
              port: process.env.MAIL_PORT, // Cổng của Mailtrap
              auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD,
              },
            });
            const href = `http://localhost:${process.env.PORT}/` + `/invoices/${fileName}`
            const mailOptions = {
              from: '"Test Mailtrap" <admin@gmail.com>',
              to: userEmail,
              subject: "Đặt hành thành công",
              text: "Đây là email test từ Mailtrap!",
              html: `<h3>Cảm ơn quá khách đã mua hàng</h3>
                  <p>Mã đơn hàng: ${savedOrder._id}</p>
                  <p><a href='${href}' target='_blank'>Click vào đây để xem hóa đơn!</a></p>`,
            };

            // Gửi email
            await transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log("Lỗi gửi email:", error);
              } else {
                console.log("Email đã được gửi:", info.messageId);
              }
            });
            // res.json({ success: "Đơn hàng đã được tạo", order: save });
          }
        });
      }

      fs.unlinkSync(filePath); // Xóa file sau khi xử lý

      return res.json({ success: "Tạo đơn hàng thành công", orders });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Lỗi xử lý file" });
    }
  }

  async getOrderByUser(req, res) {
    let { uId } = req.body;
    if (!uId) {
      return res.json({ message: "All filled must be required" });
    } else {
      try {
        let Order = await orderModel
          .find({ user: uId })
          .populate("allProduct.id", "pName pImages pPrice")
          .populate("user", "name email")
          .sort({ _id: -1 });
        if (Order) {
          return res.json({ Order });
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  async postCreateOrder(req, res) {
    let { allProduct, user, amount, transactionId, address, phone, payment_method, status_payment } = req.body;
    // console.log(allProduct, user, amount, transactionId, address, phone, payment_method, status_payment)
    if (
      !allProduct ||
      !user ||
      !amount ||
      !transactionId ||
      !address ||
      !phone
    ) {
      return res.json({ message: "All filled must be required" });
    } else {
      try {
        let newOrder = new orderModel({
          allProduct,
          user,
          amount,
          transactionId,
          address,
          phone,
          payment_method,
          status_payment,
          guarantee: 'Mar 7, 2029',
        });
        let save = await newOrder.save();
        await save.populate("allProduct.id").populate("user").execPopulate();
        if (save) {
          const userEmail = save.user.email;

          const doc = new PDFDocument();
          const fontPath = path.join(__dirname, "../fonts/Roboto-Regular.ttf");
          doc.registerFont("Roboto", fontPath);
          doc.font("Roboto");
          const fileName = `invoice_${save._id}.pdf`;
          const filePath = path.join(__dirname, "../public/invoices", fileName);

          if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
          }
          let responseSent = false;
          const writeStream = fs.createWriteStream(filePath);
          doc.pipe(writeStream);

          // Nội dung hóa đơn
          doc.fontSize(22).text("Hóa đơn mua hàng", { align: "center" }).moveDown();
          doc.fontSize(12).text(`Mã đơn: ${save._id}`);
          doc.text(`Email: ${userEmail}`);
          // doc.text(`Transaction ID: ${save.transactionId}`);
          doc.text(`Tổng số tiền: ${save.amount} VNĐ`);
          doc.text(`Địa chỉ giao hàng: ${save.address}`);
          doc.text(`Số điện thoại: ${save.phone}`).moveDown();
          doc.text("Sản phẩm đặt:", { underline: true });
          save.allProduct.forEach((product, index) => {
            const productName = product.id?.pName || "Unknown";
            doc.text(`${index + 1}. Product : ${productName} - Size: ${product.selectedSize || "Default"}, Số lượng: ${product.quantitiy}`);
            // let products_id = productModel.findById(product.id);
            // products_id.pQuantity = products_id.pQuantity - product.quantitiy;
            // products_id.save();
          });
          const tableTop = 400;
          const itemHeight = 50;
          const columnWidth = 150;
          const rowCount = 4;
          const headers = ['Sản phẩm', 'Mẫu', 'Số lượng'];
          headers.forEach((header, i) => {
            doc
              .rect(50 + i * columnWidth, tableTop, columnWidth, 20)
              .stroke()
              .text(header, 55 + i * columnWidth, tableTop + 10);
          });
          save.allProduct.forEach((product, index) => {
            const productName = product.id?.pName || "Unknown";
            // doc.text(`${index + 1}. Product : ${productName} - Size: ${product.selectedSize || "Default"}, Số lượng: ${product.quantitiy}`);
            doc.rect(50 + 0 * columnWidth, tableTop + (index + 1) * itemHeight, columnWidth, itemHeight)
            .stroke()
            .text(productName, 50 + 0 * columnWidth + 5, tableTop + (index + 1) * itemHeight + 10);

            doc.rect(50 + 1 * columnWidth, tableTop + (index + 1) * itemHeight, columnWidth, itemHeight)
            .stroke()
            .text(product.selectedSize, 50 + 1 * columnWidth + 5, tableTop + (index + 1) * itemHeight + 10);

            doc.rect(50 + 2 * columnWidth, tableTop + (index + 1) * itemHeight, columnWidth, itemHeight)
            .stroke()
            .text(product.quantitiy, 50 + 2 * columnWidth + 5, tableTop + (index + 1) * itemHeight + 10);
          });


          doc.text(``).moveDown();
          // doc.text(`Cảm ơn quá khách đã mua hàng!`);
          doc.end();

          writeStream.on("finish", async () => {
            if (!responseSent) {
              responseSent = true;
              save.pdf_bill = `/public/invoices/${fileName}`;
              await save.save();

              const transporter = await nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT, // Cổng của Mailtrap
                auth: {
                  user: process.env.MAIL_USER,
                  pass: process.env.MAIL_PASSWORD,
                },
              });
              const href = `http://localhost:${process.env.PORT}/` + `/invoices/${fileName}`
              const mailOptions = {
                from: '"Test Mailtrap" <admin@gmail.com>',
                to: userEmail,
                subject: "Đặt hành thành công",
                text: "Đây là email test từ Mailtrap!",
                html: `<h3>Cảm ơn quá khách đã mua hàng</h3>
                  <p>Mã đơn hàng: ${save._id}</p>
                  <p><a href='${href}' target='_blank'>Click vào đây để xem hóa đơn!</a></p>`,
              };

              // Gửi email
              await transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log("Lỗi gửi email:", error);
                } else {
                  console.log("Email đã được gửi:", info.messageId);
                }
              });
              // res.json({ success: "Đơn hàng đã được tạo", order: save });
            }
          });

          // writeStream.on("error", (err) => {
          //     console.error("Lỗi khi tạo PDF:", err);
          //     if (!responseSent) {
          //         responseSent = true;
          //         res.status(500).json({ error: "Không thể tạo hóa đơn PDF" });
          //     }
          //   });

          return res.json({ success: "Order created successfully", order: save });
        }
      } catch (err) {
        console.log(err);
        return res.json({ error: err, message: "Error creating order" });
      }
    }
  }

  async postUpdateOrder(req, res) {
    let { oId, status } = req.body;
    console.log(oId, status);
    if (!oId || !status) {
      return res.json({ message: "All filled must be required" });
    } else {
      let currentOrder = orderModel.findByIdAndUpdate(oId, {
        status: status,
        updatedAt: Date.now(),
      });
      currentOrder.exec((err, result) => {
        if (err) console.log(err);
        return res.json({ success: "Order updated successfully" });
      });
    }
  }

  async postUpdatePaymentOrder(req, res) {
    let { oId, status_payment } = req.body;
    console.log(oId, status_payment);
    if (!oId || !status_payment) {
      return res.json({ message: "All filled must be required" });
    } else {
      let currentOrder = orderModel.findByIdAndUpdate(oId, {
        status_payment: status_payment,
        updatedAt: Date.now(),
      });
      currentOrder.exec((err, result) => {
        if (err) console.log(err);
        return res.json({ success: "Order updated successfully" });
      });
    }
  }

  async postDeleteOrder(req, res) {
    let { oId } = req.body;
    if (!oId) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let deleteOrder = await orderModel.findByIdAndDelete(oId);
        if (deleteOrder) {
          return res.json({ success: "Order deleted successfully" });
        }
      } catch (error) {
        console.log(error);
      }
    }
  }

  async uploadStock(req, res) {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet, { range: 3 });

      const filePath = req.file.path;
      const fileName = req.file.originalname;

      // Lưu thông tin file vào MongoDB
      // const uploadedFile = await StockUpload.create({ fileName, filePath });

      let errors = [];
      for (let row of data) {
        // console.log(row)
        const { "Tên sản phẩm": product_name, "Số lượng": quantity, "Loại phiếu": type } = row;
        const product = await productModel.findOne({ pName: product_name });

        if (!product) {
          errors.push(`Product '${product_name}' not found.`);
          continue;
        }

        let qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
          errors.push(`Invalid quantity for '${product_name}'.`);
          continue;
        }

        if (type === "import") {
          product.pQuantity += qty;
        } else if (type === "export") {
          if (product.pQuantity < qty) {
            errors.push(`Not enough stock for '${product_name}'.`);
            continue;
          }
          product.pQuantity -= qty;
        } else {
          errors.push(`Invalid type '${type}' for '${product_name}'.`);
          continue;
        }

        await product.save();
        await StockTransaction.create({
          product: product._id,
          quantity: qty,
          type,
          note: `Processed via Excel Upload`,
          filePath
        });
      }

      res.json({
        message: "Stock transactions processed.",
        errors,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }

  async create_payment_url(req, res) {
    const { amount, orderInfo, bankCode, order_id } = req.query;
    console.log(req.query)
    process.env.TZ = 'Asia/Ho_Chi_Minh';

    // let ipAddr = req.headers['x-forwarded-for'] ||
    //     req.connection.remoteAddress ||
    //     req.socket.remoteAddress ||
    //     req.connection.socket.remoteAddress;

    let ipAddr = "127.0.0.0";

    let date = new Date();
    let createDate = moment(date).format('YYYYMMDDHHmmss');
    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: vnp_TmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: moment(date).format('DDHHmmss'),
      vnp_OrderInfo: order_id,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };
    if (bankCode !== null && bankCode !== '') {
      if (bankCode == "ATM") {
        vnp_Params['vnp_BankCode'] = "VNBANK";
      } else {
        vnp_Params['vnp_BankCode'] = bankCode;
      }
    }

    let sorted = {};
    let str = [];
    let key;
    for (key in vnp_Params) {
      if (vnp_Params.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(vnp_Params[str[key]]).replace(/%20/g, "+");
    }
    const sortedParams = sorted
    console.log(sortedParams)

    let signData = qs.stringify(sortedParams, { encode: false });
    let hmac = crypto.createHmac("sha512", vnp_HashSecret);
    let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    let paymentUrl = `${vnp_Url}?${qs.stringify(vnp_Params, { encode: false })}`;
    res.json({ paymentUrl });
  }

  async vnpay_return(req, res) {
    let vnp_Params = req.query;
    let secureHash = vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    if (vnp_Params["vnp_ResponseCode"] === "00") {
      let currentOrder = orderModel.findByIdAndUpdate(vnp_Params["vnp_OrderInfo"], {
        status_payment: "Successful payment",
        updatedAt: Date.now(),
      });
      currentOrder.exec((err, result) => {
        if (err) console.log(err);
        // res.send("Thanh toán thành công!");
        return res.redirect(VNP_REDIRECT + '?success=1');
      });
    } else {
      let currentOrder = orderModel.findByIdAndUpdate(vnp_Params["vnp_OrderInfo"], {
        status_payment: "Payment failed",
        updatedAt: Date.now(),
      });
      currentOrder.exec((err, result) => {
        if (err) console.log(err);
        return res.redirect(VNP_REDIRECT + '?success=0');
      });
    }

  }
}

const ordersController = new Order();
module.exports = ordersController;
