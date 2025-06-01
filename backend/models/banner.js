const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const brandSchema = new mongoose.Schema(
  {
    image: {
        type: String,
        default: null,
    },
    cStatus: {
      type: String,
      required: true,
    },
    brand_id: {
      type: ObjectId,
      ref: "brands",
      default: null,
    },
  },
  { timestamps: true }
);

const bannerModel = mongoose.model("banner", brandSchema);
module.exports = bannerModel;
