const nodemailer = require("nodemailer");
const path = require("path");

const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
    port: Number(process.env.MAILTRAP_PORT || 2525),
    secure: false,
    auth: {
        user: process.env.MAILTRAP_USER || "06f45fbaf9fb7c",
        pass: process.env.MAILTRAP_PASS || "edb5df0671c0ed",
    },
});

const defaultFrom = process.env.MAIL_FROM || "admin@hehehe.com";
const bannerPath = path.join(__dirname, "../assets/mailtrap-banner.png");

async function sendMail(options) {
    return transporter.sendMail({
        from: defaultFrom,
        ...options,
    });
}

async function sendResetPasswordMail(to, url) {
    return sendMail({
        to: to,
        subject: "reset pass",
        text: `click vao day de doi mat khau: ${url}`,
        html: `click vao <a href="${url}">day</a> de doi mat khau`,
    });
}

async function sendUserCredentialsMail(to, username, password) {
    return sendMail({
        to: to,
        subject: "Thong tin tai khoan moi",
        text: `Tai khoan cua ban da duoc tao. Username: ${username}. Password tam thoi: ${password}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
                <img src="cid:user-import-banner" alt="User import banner" style="width: 100%; max-width: 600px; border-radius: 12px; display: block; margin-bottom: 24px;" />
                <h2 style="margin: 0 0 16px;">Thong tin tai khoan moi</h2>
                <p style="margin: 0 0 12px;">Tai khoan cua ban da duoc tao tu file import.</p>
                <p style="margin: 0 0 8px;"><strong>Username:</strong> ${username}</p>
                <p style="margin: 0 0 8px;"><strong>Email:</strong> ${to}</p>
                <p style="margin: 0 0 20px;"><strong>Password tam thoi:</strong> ${password}</p>
                <p style="margin: 0;">Hay dang nhap va doi mat khau ngay sau lan dang nhap dau tien.</p>
            </div>
        `,
        attachments: [
            {
                filename: "mailtrap-banner.png",
                path: bannerPath,
                contentType: "image/png",
                cid: "user-import-banner",
            },
        ],
    });
}

module.exports = {
    sendMail: sendResetPasswordMail,
    sendRawMail: sendMail,
    sendUserCredentialsMail: sendUserCredentialsMail,
};
