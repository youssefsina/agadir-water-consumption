const fs = require('fs');
const path = require('path');

const locales = ['en', 'fr', 'ar', 'zgh-Tfng'];
const messagesDir = path.join(__dirname, 'frontend', 'messages');

const leakTranslations = {
    en: {
        anomalyDetected: "Leak detected! Confidence: {confidence}%",
        unknownAnomaly: "Leak",
        scenarioLeak: "Night Leak",
        scenarioBurst: "Major Leak",
        scenarioOverIrr: "Leak (Surface)",
        scenarioUnderIrr: "Leak (Underground)"
    },
    fr: {
        anomalyDetected: "Fuite détectée ! Confiance : {confidence}%",
        unknownAnomaly: "Fuite",
        scenarioLeak: "Fuite nocturne",
        scenarioBurst: "Fuite majeure",
        scenarioOverIrr: "Fuite (Surface)",
        scenarioUnderIrr: "Fuite (Souterraine)"
    },
    ar: {
        anomalyDetected: "تم اكتشاف تسرب! الثقة: {confidence}%",
        unknownAnomaly: "تسرب",
        scenarioLeak: "تسرب ليلي",
        scenarioBurst: "تسرب كبير",
        scenarioOverIrr: "تسرب (سطحي)",
        scenarioUnderIrr: "تسرب (مخفي)"
    },
    "zgh-Tfng": {
        anomalyDetected: "ⵢⵜⵜⵡⴰⴼ ⵓⵙⵔⵓⴱ! ⵜⴰⵏⴼⵔⵓⵜ: {confidence}%",
        unknownAnomaly: "ⴰⵙⵔⵓⴱ",
        scenarioLeak: "ⴰⵙⵔⵓⴱ ⵏ ⵢⵉⴹ",
        scenarioBurst: "ⴰⵙⵔⵓⴱ ⴰⵎⵇⵇⵔⴰⵏ",
        scenarioOverIrr: "ⴰⵙⵔⵓⴱ (ⴰⴼⵍⵍⴰ)",
        scenarioUnderIrr: "ⴰⵙⵔⵓⴱ (ⴷⴷⴰⵡ ⴰⴽⴰⵍ)"
    }
};

locales.forEach(loc => {
    const filePath = path.join(messagesDir, `${loc}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!data.dashboard) data.dashboard = {};
        Object.assign(data.dashboard, leakTranslations[loc]);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log(`Updated leaks in ${loc}.json`);
    }
});
