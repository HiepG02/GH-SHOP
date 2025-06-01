const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const stockTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["import", "export"], // nhập hoặc xuất
      required: true,
    },
    product: {
      type: ObjectId,
      ref: "products",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
    },
    filePath: { type: String, default: "", },
  },
  { timestamps: true }
);

const StockTransaction = mongoose.model("stock_transactions", stockTransactionSchema);
module.exports = StockTransaction;
