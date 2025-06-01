const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const orderSchema = new mongoose.Schema(
  {
    allProduct: [
      {
        id: { type: ObjectId, ref: "products" },
        quantitiy: Number,
        selectedSize: {
          type: String,
          default: null,
        },
      },
    ],
    user: {
      type: ObjectId,
      ref: "users",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    pdf_bill: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: "Not processed",
      enum: [
        "Not processed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
    },
    payment_method: {
      type: String,
      default: "Cash on Delivery",
      enum: [
        "Cash on Delivery",
        "PayPal",
        "VNPAYQR",
        "ATM",
        "INTCARD",
      ],
    },
    status_payment: {
      type: String,
      default: "Not payment",
      enum: [
        "Not payment",
        "Successful payment",
        "Payment failed",
      ],
    },
    guarantee: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const orderModel = mongoose.model("orders", orderSchema);
module.exports = orderModel;
