const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    cName: {
      type: String,
      required: true,
    },
    cDescription: {
      type: String,
      required: true,
    },
    avatar: {
        type: String,
        default: null,
    },
    view: {
        type: Number,
        default: 0,
    },
    cStatus: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const brandModel = mongoose.model("brands", brandSchema);
module.exports = brandModel;
