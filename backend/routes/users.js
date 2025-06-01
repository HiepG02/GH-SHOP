const express = require("express");
const router = express.Router();
const usersController = require("../controller/users");

router.post("/forgot-password", usersController.send_email);
router.post("/reset-password", usersController.change_password);

router.get("/all-user", usersController.getAllUser);
router.post("/signle-user", usersController.getSingleUser);

router.post("/add-user", usersController.postAddUser);
router.post("/edit-user", usersController.postEditUser);
router.post("/delete-user", usersController.getDeleteUser);

router.post("/change-password", usersController.changePassword);

module.exports = router;
