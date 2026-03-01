const fs = require('fs');
const path = require('path');

const locales = ['en', 'fr', 'ar', 'zgh-Tfng'];
const messagesDir = path.join(__dirname, 'frontend', 'messages');

const settingsTranslations = {
    en: {
        systemPreferences: "System Preferences",
        systemPrefDesc: "Configure global app behavior",
        devDebugMode: "Developer Debug Mode",
        devDebugModeDesc: "Show advanced simulator and testing tools on Dashboard and Map."
    },
    fr: {
        systemPreferences: "Préférences Système",
        systemPrefDesc: "Configurer le comportement global de l'application",
        devDebugMode: "Mode de Débogage Développeur",
        devDebugModeDesc: "Afficher le simulateur avancé et les outils de test sur le Tableau de Bord et la Carte."
    },
    ar: {
        systemPreferences: "تفضيلات النظام",
        systemPrefDesc: "تكوين السلوك العام للتطبيق",
        devDebugMode: "وضع تصحيح أخطاء المطور",
        devDebugModeDesc: "إظهار المحاكي المتقدم وأدوات الاختبار على لوحة المعلومات والخريطة."
    },
    "zgh-Tfng": {
        systemPreferences: "ⵜⵉⵙⵖⴰⵍⵉⵏ ⵏ ⵓⵏⴰⴳⵔⴰⵡ",
        systemPrefDesc: "ⵙⵡⵓⴷⴷⵓ ⵜⵉⵎⵙⵙⵓⴳⵓⵔⵉⵏ ⵏ ⵓⵏⴰⴳⵔⴰⵡ",
        devDebugMode: "ⴰⴷⴷⴰⴷ ⵏ ⵓⵙⴼⵙⴰⵢ",
        devDebugModeDesc: "ⵙⵙⴽⵏ ⴰⵎⴰⵙⵙⴰⵔ ⵏ ⵓⵙⴼⵙⴰⵢ ⴷ ⵉⵎⴰⵙⵙⵏ ⵖⴼ ⵓⵙⴼⵍⵓ ⴷ ⵜⴽⴰⵔⴹⴰ."
    }
};

locales.forEach(loc => {
    const filePath = path.join(messagesDir, `${loc}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!data.settings) data.settings = {};
        Object.assign(data.settings, settingsTranslations[loc]);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log(`Updated settings in ${loc}.json`);
    }
});
