const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const ORDERS_FILE = path.join(__dirname, "orders.json");
const REVIEWS_FILE = path.join(__dirname, "reviews.json");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
}

if (!fs.existsSync(REVIEWS_FILE)) {
    fs.writeFileSync(REVIEWS_FILE, "[]", "utf8");
}


/* =====================================================
   ORDERS
===================================================== */

function readOrders() {
    try {
        return JSON.parse(
            fs.readFileSync(ORDERS_FILE, "utf8")
        );
    } catch {
        return [];
    }
}

function saveOrders(orders) {
    fs.writeFileSync(
        ORDERS_FILE,
        JSON.stringify(orders, null, 2),
        "utf8"
    );
}


/* =====================================================
   REVIEWS
===================================================== */

function readReviews() {
    try {
        return JSON.parse(
            fs.readFileSync(REVIEWS_FILE, "utf8")
        );
    } catch {
        return [];
    }
}

function saveReviews(reviews) {
    fs.writeFileSync(
        REVIEWS_FILE,
        JSON.stringify(reviews, null, 2),
        "utf8"
    );
}


/* =====================================================
   JSON RESPONSE
===================================================== */

function sendJSON(res, status, data) {

    res.writeHead(status, {
        "Content-Type":
            "application/json; charset=utf-8",

        "Access-Control-Allow-Origin": "*",

        "Access-Control-Allow-Methods":
            "GET, POST, PUT, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type"
    });

    res.end(
        JSON.stringify(data)
    );
}


/* =====================================================
   STATIC FILES
===================================================== */

function serveFile(req, res) {

    let requested =
        req.url === "/"
            ? "/index.html"
            : req.url;

    requested =
        requested.split("?")[0];

    let baseDir = PUBLIC_DIR;

    if (
        requested.startsWith("/uploads/")
    ) {

        baseDir = UPLOAD_DIR;

        requested =
            requested.replace(
                "/uploads/",
                "/"
            );
    }

    const filePath =
        path.normalize(
            path.join(
                baseDir,
                requested
            )
        );

    if (
        !filePath.startsWith(baseDir)
    ) {

        res.writeHead(403);

        res.end("Forbidden");

        return;
    }

    fs.readFile(
        filePath,
        (err, data) => {

            if (err) {

                res.writeHead(404);

                res.end(
                    "File not found"
                );

                return;
            }

            const ext =
                path.extname(
                    filePath
                ).toLowerCase();

            const types = {

                ".html":
                    "text/html; charset=utf-8",

                ".css":
                    "text/css; charset=utf-8",

                ".js":
                    "application/javascript; charset=utf-8",

                ".jpg":
                    "image/jpeg",

                ".jpeg":
                    "image/jpeg",

                ".png":
                    "image/png",

                ".webp":
                    "image/webp",

                ".gif":
                    "image/gif",

                ".svg":
                    "image/svg+xml",

                ".zip":
                    "application/zip",

                ".rar":
                    "application/vnd.rar",

                ".7z":
                    "application/x-7z-compressed",

                ".bin":
                    "application/octet-stream",

                ".txt":
                    "text/plain; charset=utf-8"
            };

            res.writeHead(
                200,
                {
                    "Content-Type":
                        types[ext] ||
                        "application/octet-stream"
                }
            );

            res.end(data);
        }
    );
}


/* =====================================================
   SAVE IMAGE
===================================================== */

function saveImage(
    dataUrl,
    folder,
    filename
) {

    if (
        !dataUrl ||
        !dataUrl.includes(",")
    ) {
        return null;
    }

    const base64 =
        dataUrl.split(",")[1];

    const buffer =
        Buffer.from(
            base64,
            "base64"
        );

    const filePath =
        path.join(
            folder,
            filename
        );

    fs.writeFileSync(
        filePath,
        buffer
    );

    return filename;
}


/* =====================================================
   SAVE PROJECT FILE
===================================================== */

function saveProjectFile(
    data,
    orderId
) {

    if (
        !data ||
        !data.includes(",")
    ) {
        return null;
    }

    const orderFolder =
        path.join(
            UPLOAD_DIR,
            orderId
        );

    if (
        !fs.existsSync(orderFolder)
    ) {
        fs.mkdirSync(
            orderFolder,
            {
                recursive: true
            }
        );
    }

    const parts =
        data.split(",");

    const meta =
        parts[0] || "";

    const base64 =
        parts[1] || "";

    let extension = "bin";

    if (
        meta.includes("application/zip")
    ) {
        extension = "zip";
    }
    else if (
        meta.includes("application/x-rar")
    ) {
        extension = "rar";
    }
    else if (
        meta.includes("application/vnd.rar")
    ) {
        extension = "rar";
    }
    else if (
        meta.includes("7z")
    ) {
        extension = "7z";
    }

    const filename =
        "FACEFORGE-" +
        orderId +
        "." +
        extension;

    const filePath =
        path.join(
            orderFolder,
            filename
        );

    const buffer =
        Buffer.from(
            base64,
            "base64"
        );

    fs.writeFileSync(
        filePath,
        buffer
    );

    return {
        filename,
        url:
            "/uploads/" +
            orderId +
            "/" +
            filename
    };
}


/* =====================================================
   SERVER
===================================================== */

const server =
    http.createServer(
        (req, res) => {

            /* OPTIONS */

            if (
                req.method === "OPTIONS"
            ) {

                res.writeHead(
                    204,
                    {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods":
                            "GET, POST, PUT, OPTIONS",
                        "Access-Control-Allow-Headers":
                            "Content-Type"
                    }
                );

                res.end();

                return;
            }


            /* =================================================
               GET ORDERS
            ================================================= */

            if (
                req.method === "GET" &&
                req.url === "/api/orders"
            ) {

                const orders =
                    readOrders();

                sendJSON(
                    res,
                    200,
                    {
                        success: true,
                        orders
                    }
                );

                return;
            }


            /* =================================================
               CREATE ORDER
            ================================================= */

            if (
                req.method === "POST" &&
                req.url === "/api/order"
            ) {

                let body = "";

                req.on(
                    "data",
                    chunk => {

                        body +=
                            chunk.toString();

                        if (
                            body.length >
                            30 * 1024 * 1024
                        ) {

                            res.writeHead(
                                413
                            );

                            res.end(
                                "Request too large"
                            );

                            req.destroy();
                        }
                    }
                );

                req.on(
                    "end",
                    () => {

                        try {

                            const data =
                                JSON.parse(
                                    body
                                );

                            const orders =
                                readOrders();

                            const id =
                                "FF-" +
                                Date.now();

                            const customerFolder =
                                path.join(
                                    UPLOAD_DIR,
                                    id
                                );

                            fs.mkdirSync(
                                customerFolder
                            );

                            const front =
                                saveImage(
                                    data.images?.front,
                                    customerFolder,
                                    "front.jpg"
                                );

                            const left =
                                saveImage(
                                    data.images?.left,
                                    customerFolder,
                                    "left.jpg"
                                );

                            const right =
                                saveImage(
                                    data.images?.right,
                                    customerFolder,
                                    "right.jpg"
                                );

                            const threequarter =
                                saveImage(
                                    data.images?.threequarter,
                                    customerFolder,
                                    "threequarter.jpg"
                                );

                            const newOrder = {

                                id,

                                name:
                                    data.name ||
                                    "",

                                phone:
                                    data.phone ||
                                    "",

                                email:
                                    data.email ||
                                    "",

                                city:
                                    data.city ||
                                    "",

                                description:
                                    data.description ||
                                    "",

                                status:
                                    "new",

                                images: {

                                    front:
                                        front
                                            ? `/uploads/${id}/front.jpg`
                                            : null,

                                    left:
                                        left
                                            ? `/uploads/${id}/left.jpg`
                                            : null,

                                    right:
                                        right
                                            ? `/uploads/${id}/right.jpg`
                                            : null,

                                    threequarter:
                                        threequarter
                                            ? `/uploads/${id}/threequarter.jpg`
                                            : null
                                },

                                projectFile:
                                    null,

                                createdAt:
                                    new Date()
                                    .toISOString()
                            };

                            orders.push(
                                newOrder
                            );

                            saveOrders(
                                orders
                            );

                            console.log("");
                            console.log(
                                "NEW ORDER:",
                                id
                            );
                            console.log(
                                "Customer:",
                                newOrder.name
                            );
                            console.log(
                                "Images saved."
                            );
                            console.log("");

                            sendJSON(
                                res,
                                201,
                                {
                                    success:
                                        true,
                                    order:
                                        newOrder
                                }
                            );

                        }
                        catch (error) {

                            console.log(
                                "ORDER ERROR:",
                                error
                            );

                            sendJSON(
                                res,
                                400,
                                {
                                    success:
                                        false,
                                    message:
                                        "اطلاعات سفارش نامعتبر است."
                                }
                            );
                        }
                    }
                );

                return;
            }


            /* =================================================
               UPLOAD FINAL PROJECT FILE
            ================================================= */

            if (
                req.method === "POST" &&
                req.url === "/api/upload-project"
            ) {

                let body = "";

                req.on(
                    "data",
                    chunk => {

                        body +=
                            chunk.toString();

                        /*
                           حداکثر 100MB
                        */

                        if (
                            body.length >
                            100 * 1024 * 1024
                        ) {

                            res.writeHead(
                                413
                            );

                            res.end(
                                "File too large"
                            );

                            req.destroy();
                        }
                    }
                );

                req.on(
                    "end",
                    () => {

                        try {

                            const data =
                                JSON.parse(
                                    body
                                );

                            const orderId =
                                String(
                                    data.orderId ||
                                    ""
                                ).trim();

                            const fileData =
                                data.fileData;

                            if (
                                !orderId ||
                                !fileData
                            ) {

                                sendJSON(
                                    res,
                                    400,
                                    {
                                        success:
                                            false,
                                        message:
                                            "سفارش یا فایل مشخص نشده است."
                                    }
                                );

                                return;
                            }

                            const orders =
                                readOrders();

                            const order =
                                orders.find(
                                    item =>
                                        item.id ===
                                        orderId
                                );

                            if (!order) {

                                sendJSON(
                                    res,
                                    404,
                                    {
                                        success:
                                            false,
                                        message:
                                            "سفارش پیدا نشد."
                                    }
                                );

                                return;
                            }

                            const projectFile =
                                saveProjectFile(
                                    fileData,
                                    orderId
                                );

                            if (
                                !projectFile
                            ) {

                                sendJSON(
                                    res,
                                    400,
                                    {
                                        success:
                                            false,
                                        message:
                                            "فایل نامعتبر است."
                                    }
                                );

                                return;
                            }

                            order.projectFile =
                                projectFile;

                            order.status =
                                "ready";

                            order.readyAt =
                                new Date()
                                .toISOString();

                            saveOrders(
                                orders
                            );

                            console.log("");
                            console.log(
                                "PROJECT FILE UPLOADED:",
                                orderId
                            );
                            console.log(
                                projectFile.filename
                            );
                            console.log("");

                            sendJSON(
                                res,
                                200,
                                {
                                    success:
                                        true,
                                    order
                                }
                            );

                        }
                        catch (error) {

                            console.log(
                                "PROJECT FILE ERROR:",
                                error
                            );

                            sendJSON(
                                res,
                                400,
                                {
                                    success:
                                        false,
                                    message:
                                        "آپلود فایل انجام نشد."
                                }
                            );
                        }
                    }
                );

                return;
            }


            /* =================================================
               GET CUSTOMER PROJECT
            ================================================= */

            if (
                req.method === "GET" &&
                req.url.startsWith(
                    "/api/project/"
                )
            ) {

                const orderId =
                    decodeURIComponent(
                        req.url
                            .replace(
                                "/api/project/",
                                ""
                            )
                            .split("?")[0]
                    );

                const orders =
                    readOrders();

                const order =
                    orders.find(
                        item =>
                            item.id ===
                            orderId
                    );

                if (!order) {

                    sendJSON(
                        res,
                        404,
                        {
                            success:
                                false,
                            message:
                                "سفارش پیدا نشد."
                        }
                    );

                    return;
                }

                sendJSON(
                    res,
                    200,
                    {
                        success:
                            true,

                        order: {

                            id:
                                order.id,

                            name:
                                order.name,

                            status:
                                order.status,

                            projectFile:
                                order.projectFile ||
                                null
                        }
                    }
                );

                return;
            }


            /* =================================================
               REVIEWS
            ================================================= */

            if (
                req.method === "GET" &&
                req.url === "/api/reviews"
            ) {

                const reviews =
                    readReviews();

                sendJSON(
                    res,
                    200,
                    {
                        success:
                            true,
                        reviews
                    }
                );

                return;
            }


            /* CREATE REVIEW */

            if (
                req.method === "POST" &&
                req.url === "/api/reviews"
            ) {

                let body = "";

                req.on(
                    "data",
                    chunk => {

                        body +=
                            chunk.toString();

                        if (
                            body.length >
                            100000
                        ) {

                            res.writeHead(
                                413
                            );

                            res.end(
                                "Request too large"
                            );

                            req.destroy();
                        }
                    }
                );

                req.on(
                    "end",
                    () => {

                        try {

                            const data =
                                JSON.parse(
                                    body
                                );

                            const name =
                                String(
                                    data.name ||
                                    ""
                                ).trim();

                            const text =
                                String(
                                    data.text ||
                                    ""
                                ).trim();

                            const clientId =
                                String(
                                    data.clientId ||
                                    ""
                                ).trim();

                            if (
                                !name ||
                                !text ||
                                !clientId
                            ) {

                                sendJSON(
                                    res,
                                    400,
                                    {
                                        success:
                                            false,
                                        message:
                                            "اطلاعات نظر کامل نیست."
                                    }
                                );

                                return;
                            }

                            const reviews =
                                readReviews();

                            const alreadyExists =
                                reviews.some(
                                    review =>
                                        review.clientId ===
                                        clientId
                                );

                            if (
                                alreadyExists
                            ) {

                                sendJSON(
                                    res,
                                    409,
                                    {
                                        success:
                                            false,
                                        message:
                                            "این مرورگر قبلاً یک نظر ثبت کرده است."
                                    }
                                );

                                return;
                            }

                            const newReview = {

                                id:
                                    "REV-" +
                                    Date.now(),

                                name,

                                text,

                                clientId,

                                createdAt:
                                    new Date()
                                    .toISOString()
                            };

                            reviews.unshift(
                                newReview
                            );

                            saveReviews(
                                reviews
                            );

                            sendJSON(
                                res,
                                201,
                                {
                                    success:
                                        true,
                                    review:
                                        newReview
                                }
                            );

                        }
                        catch {

                            sendJSON(
                                res,
                                400,
                                {
                                    success:
                                        false,
                                    message:
                                        "ثبت نظر انجام نشد."
                                }
                            );
                        }
                    }
                );

                return;
            }


            /* EDIT REVIEW */

            if (
                req.method === "PUT" &&
                req.url.startsWith(
                    "/api/reviews/"
                )
            ) {

                const reviewId =
                    req.url
                        .replace(
                            "/api/reviews/",
                            ""
                        )
                        .split("?")[0];

                let body = "";

                req.on(
                    "data",
                    chunk => {

                        body +=
                            chunk.toString();

                        if (
                            body.length >
                            100000
                        ) {

                            res.writeHead(
                                413
                            );

                            res.end(
                                "Request too large"
                            );

                            req.destroy();
                        }
                    }
                );

                req.on(
                    "end",
                    () => {

                        try {

                            const data =
                                JSON.parse(
                                    body
                                );

                            const clientId =
                                String(
                                    data.clientId ||
                                    ""
                                ).trim();

                            const name =
                                String(
                                    data.name ||
                                    ""
                                ).trim();

                            const text =
                                String(
                                    data.text ||
                                    ""
                                ).trim();

                            if (
                                !clientId ||
                                !name ||
                                !text
                            ) {

                                sendJSON(
                                    res,
                                    400,
                                    {
                                        success:
                                            false,
                                        message:
                                            "اطلاعات نظر کامل نیست."
                                    }
                                );

                                return;
                            }

                            const reviews =
                                readReviews();

                            const review =
                                reviews.find(
                                    item =>
                                        item.id ===
                                        reviewId
                                );

                            if (!review) {

                                sendJSON(
                                    res,
                                    404,
                                    {
                                        success:
                                            false,
                                        message:
                                            "نظر پیدا نشد."
                                    }
                                );

                                return;
                            }

                            if (
                                review.clientId !==
                                clientId
                            ) {

                                sendJSON(
                                    res,
                                    403,
                                    {
                                        success:
                                            false,
                                        message:
                                            "اجازه ویرایش این نظر را نداری."
                                    }
                                );

                                return;
                            }

                            review.name =
                                name;

                            review.text =
                                text;

                            review.updatedAt =
                                new Date()
                                .toISOString();

                            saveReviews(
                                reviews
                            );

                            sendJSON(
                                res,
                                200,
                                {
                                    success:
                                        true,
                                    review
                                }
                            );

                        }
                        catch {

                            sendJSON(
                                res,
                                400,
                                {
                                    success:
                                        false,
                                    message:
                                        "ویرایش نظر انجام نشد."
                                }
                            );
                        }
                    }
                );

                return;
            }


            /* =================================================
               STATIC
            ================================================= */

            serveFile(
                req,
                res
            );
        }
    );


/* =====================================================
   START
===================================================== */

server.listen(
    PORT, "0.0.0.0", 
    () => {

        console.log("");
        console.log(
            "================================="
        );
        console.log(
            "       FACEFORGE SERVER"
        );
        console.log(
            "================================="
        );
        console.log("");

        console.log(
            "Website:"
        );

        console.log(
            "http://localhost:3000"
        );

        console.log("");

        console.log(
            "Admin:"
        );

        console.log(
            "http://localhost:3000/admin.html"
        );

        console.log("");

        console.log(
            "Server is running..."
        );

        console.log("");
    }
);
