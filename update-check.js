/*
 * update-check.js
 *
 * لا يحتاج version.txt ولا أرقام 1 و2 و3.
 * يفحص ملف index.html الموجود على السيرفر مباشرة.
 *
 * ضع هذا الملف بجانب index.html، ثم أضف في index.html:
 *
 * <script src="update-check.js"></script>
 *
 * عند رفع index.html جديد، سيتم اكتشاف الاختلاف تلقائيًا.
 * لا يوجد Refresh يدوي من المستخدم.
 */

(function () {

    "use strict";

    /* الفحص كل 5 ثوانٍ */
    var CHECK_INTERVAL = 1000;

    /* ملف الموقع الذي تتم مراقبته */
    var SITE_FILE = "index.html";

    /* النسخة التي فتحها المستخدم حاليًا */
    var originalHTML = null;

    /* منع تشغيل فحصين في نفس الوقت */
    var checking = false;

    /* منع إعادة التحديث أكثر من مرة في نفس اللحظة */
    var updating = false;


    /*
     * تحميل index.html من السيرفر بدون الاعتماد على Cache.
     */
    async function getLatestHTML() {

        try {

            var response = await fetch(
                SITE_FILE + "?update_check=" + Date.now(),
                {
                    method: "GET",
                    cache: "no-store",
                    credentials: "same-origin"
                }
            );

            if (!response.ok) {
                return null;
            }

            return await response.text();

        } catch (error) {

            /*
             * لو الإنترنت غير متاح أو حصل خطأ،
             * لا نفعل أي شيء.
             */
            return null;
        }
    }


    /*
     * إزالة الاختلافات البسيطة التي لا تعتبر تحديثًا حقيقيًا.
     */
    function normalizeHTML(html) {

        if (!html) {
            return "";
        }

        return html
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim();

    }


    /*
     * تحميل النسخة الجديدة واستبدال الصفحة الحالية بها
     * بدون أن يضغط المستخدم Refresh.
     */
    async function applyUpdate(newHTML) {

        if (updating) {
            return;
        }

        updating = true;

        try {

            /*
             * document.open/write/close يعيد بناء الصفحة
             * بالنسخة الجديدة مباشرة.
             */
            document.open();

            document.write(newHTML);

            document.close();

        } catch (error) {

            /*
             * في حالة فشل الاستبدال، لا نكسر الموقع الحالي.
             */
            updating = false;
        }

    }


    /*
     * فحص هل index.html تغير.
     */
    async function checkForUpdate() {

        if (checking || updating) {
            return;
        }

        checking = true;

        var latestHTML = await getLatestHTML();

        checking = false;

        /*
         * لو لم نستطع الوصول للملف، ننتظر الفحص القادم.
         */
        if (latestHTML === null) {
            return;
        }

        /*
         * أول مرة:
         * نحفظ نسخة index.html الحالية فقط.
         */
        if (originalHTML === null) {

            originalHTML = normalizeHTML(latestHTML);

            return;
        }

        /*
         * مقارنة النسخة الموجودة على السيرفر
         * بالنسخة التي بدأ بها المستخدم.
         */
        if (
            normalizeHTML(latestHTML) !== originalHTML
        ) {

            await applyUpdate(latestHTML);

        }

    }


    /*
     * يبدأ الفحص بعد تحميل الصفحة.
     */
    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            function () {
                checkForUpdate();
            },
            { once: true }
        );

    } else {

        checkForUpdate();

    }


    /*
     * مراقبة index.html باستمرار.
     */
    setInterval(
        checkForUpdate,
        CHECK_INTERVAL
    );


})();