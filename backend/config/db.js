const mongoose = require("mongoose");
try {
  // mongoose.connect("mongodb://localhost:27017/Ecommerce", {
  //   useNewUrlParser: true,
  //   useUnifiedTopology: true,
  //   useCreateIndex: true,
  //   useFindAndModify: false
  // });
  mongoose.connect("mongodb://localhost:27017/Ecommerce",{
    useUnifiedTopology: true,
    useFindAndModify: false
  });
  console.log("Database Connected Successfully");
} catch (err) {
  console.log("Database Not Connected");
}

// try {
//   mongoose.connect("mongodb+srv://admin:admin@cluster0.lgck8nz.mongodb.net/?retryWrites=true&w=majority", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useCreateIndex: true,
//   });
//   console.log("Database Connected Successfully");
// } catch (err) {
//   console.log("Database Not Connected");
// }
