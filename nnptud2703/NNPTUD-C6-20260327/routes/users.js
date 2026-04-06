var express = require("express");
var router = express.Router();
let { checkLogin, CheckPermission } = require('../utils/authHandler')
let { userCreateValidator
    , userUpdateValidator
    , handleResultValidator } = require('../utils/validatorHandler')
let userController = require("../controllers/users");
let userModel = require("../schemas/users");
let roleModel = require("../schemas/roles");
let { uploadExcel } = require("../utils/upload");
let exceljs = require("exceljs");
let path = require("path");
let crypto = require("crypto");
let { sendUserCredentialsMail } = require("../utils/senMailHandler");

function getCellValue(cell) {
    if (!cell || cell.value == null) {
        return "";
    }
    if (typeof cell.value === "object") {
        if (cell.value.text) {
            return String(cell.value.text).trim();
        }
        if (cell.value.result) {
            return String(cell.value.result).trim();
        }
    }
    return String(cell.value).trim();
}

function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase();
}

function generateRandomPassword(length) {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    const bytes = crypto.randomBytes(length);
    let result = "";
    for (let index = 0; index < length; index++) {
        result += charset[bytes[index] % charset.length];
    }
    return result;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


router.get("/", checkLogin, CheckPermission("ADMIN")
    , async function (req, res, next) {
        let users = await userController.GetAllUser();
        res.send(users);
    });

router.get("/:id", async function (req, res, next) {
    try {
        let result = await userModel
            .find({ _id: req.params.id, isDeleted: false })
        if (result.length > 0) {
            res.send(result);
        }
        else {
            res.status(404).send({ message: "id not found" });
        }
    } catch (error) {
        res.status(404).send({ message: "id not found" });
    }
});

router.post("/", userCreateValidator, handleResultValidator,
    async function (req, res, next) {
        try {
            let newItem = userController.CreateAnUser(
                req.body.username,
                req.body.password,
                req.body.email,
                req.body.role,
                req.body.fullName,
                req.body.avatarUrl,
                req.body.status,
                req.body.loginCount
            )
            await newItem.save();

            // populate cho đẹp
            let saved = await userModel
                .findById(newItem._id)
            res.send(saved);
        } catch (err) {
            res.status(400).send({ message: err.message });
        }
    });

router.post("/import", checkLogin, CheckPermission("ADMIN"), uploadExcel.single("file"), async function (req, res, next) {
    if (!req.file) {
        return res.status(400).send({ message: "file khong duoc de trong" });
    }

    try {
        const userRole = await roleModel.findOne({
            name: { $regex: /^user$/i },
            isDeleted: false
        });
        if (!userRole) {
            return res.status(400).send({ message: "khong tim thay role user" });
        }

        const workbook = new exceljs.Workbook();
        const pathFile = path.join(__dirname, "../uploads", req.file.filename);
        await workbook.xlsx.readFile(pathFile);

        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).send({ message: "file excel khong co du lieu" });
        }

        const headerRow = worksheet.getRow(1);
        const headerMap = new Map();
        headerRow.eachCell(function (cell, colNumber) {
            headerMap.set(normalizeHeader(cell.value), colNumber);
        });

        const usernameColumn = headerMap.get("username") || 1;
        const emailColumn = headerMap.get("email") || 2;

        const existingUsers = await userModel.find({ isDeleted: false }).select("username email");
        const existingUsernames = new Set(existingUsers.map(user => String(user.username).toLowerCase()));
        const existingEmails = new Set(existingUsers.map(user => String(user.email).toLowerCase()));

        const result = [];
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const username = getCellValue(row.getCell(usernameColumn));
            const email = getCellValue(row.getCell(emailColumn)).toLowerCase();
            const rowErrors = [];

            if (!username) {
                rowErrors.push("username khong duoc de trong");
            }
            if (!email) {
                rowErrors.push("email khong duoc de trong");
            } else if (!/^\S+@\S+\.\S+$/.test(email)) {
                rowErrors.push("email khong dung dinh dang");
            }
            if (existingUsernames.has(username.toLowerCase())) {
                rowErrors.push("username da ton tai");
            }
            if (existingEmails.has(email)) {
                rowErrors.push("email da ton tai");
            }
            if (rowErrors.length > 0) {
                result.push({
                    row: rowNumber,
                    status: "failed",
                    errors: rowErrors
                });
                continue;
            }

            const password = generateRandomPassword(16);
            try {
                const newUser = userController.CreateAnUser(
                    username,
                    password,
                    email,
                    userRole._id
                );
                await newUser.save();
                existingUsernames.add(username.toLowerCase());
                existingEmails.add(email);

                try {
                    await sendUserCredentialsMail(email, username, password);
                    await delay(1200);

                    result.push({
                        row: rowNumber,
                        status: "success",
                        user: {
                            id: newUser._id,
                            username: username,
                            email: email,
                            role: userRole.name
                        }
                    });
                } catch (mailError) {
                    result.push({
                        row: rowNumber,
                        status: "mail_failed",
                        user: {
                            id: newUser._id,
                            username: username,
                            email: email,
                            role: userRole.name
                        },
                        errors: [mailError.message]
                    });
                }
            } catch (error) {
                result.push({
                    row: rowNumber,
                    status: "failed",
                    errors: [error.message]
                });
            }
        }

        res.send({
            filename: req.file.filename,
            total: Math.max(worksheet.rowCount - 1, 0),
            success: result.filter(item => item.status === "success").length,
            mailFailed: result.filter(item => item.status === "mail_failed").length,
            failed: result.filter(item => item.status === "failed").length,
            result: result
        });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

router.put("/:id", userUpdateValidator, handleResultValidator, async function (req, res, next) {
    try {
        let id = req.params.id;
        //c1
        let updatedItem = await
            userModel.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedItem)
            return res.status(404).send({ message: "id not found" });
        //c2
        // let updatedItem = await userModel.findById(id);
        // if (updatedItem) {
        //     let keys = Object.keys(req.body);
        //     for (const key of keys) {
        //         getUser[key] = req.body[key]
        //     }
        // }
        // await updatedItem.save()
        let populated = await userModel
            .findById(updatedItem._id)
        res.send(populated);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

router.delete("/:id", async function (req, res, next) {
    try {
        let id = req.params.id;
        let updatedItem = await userModel.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );
        if (!updatedItem) {
            return res.status(404).send({ message: "id not found" });
        }
        res.send(updatedItem);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;
