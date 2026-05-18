"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyToClipboard = exports.formatDate = exports.getSeverityColor = exports.detectOS = exports.generateUUID = exports.saveLocalData = exports.getLocalData = exports.saveSettings = exports.getSettings = void 0;
async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            apiKey: '',
            backendUrl: 'http://localhost:3000',
            apiToken: '',
            bugPriority: 'medium',
            screenshotQuality: 90,
            autoAnalyze: true,
            userUrlHeaderName: 'x-user-url',
            cookieTokenApp: 'none',
            customCookieName: ''
        }, (items) => {
            resolve(items);
        });
    });
}
exports.getSettings = getSettings;
async function saveSettings(settings) {
    return new Promise((resolve) => {
        chrome.storage.sync.set(settings, () => {
            resolve();
        });
    });
}
exports.saveSettings = saveSettings;
async function getLocalData(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (items) => {
            resolve(items[key]);
        });
    });
}
exports.getLocalData = getLocalData;
async function saveLocalData(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve();
        });
    });
}
exports.saveLocalData = saveLocalData;
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.generateUUID = generateUUID;
function detectOS(userAgent) {
    if (userAgent.includes('Windows'))
        return 'Windows';
    if (userAgent.includes('Mac'))
        return 'macOS';
    if (userAgent.includes('Linux'))
        return 'Linux';
    if (userAgent.includes('Android'))
        return 'Android';
    if (userAgent.includes('iPhone'))
        return 'iOS';
    return 'Unknown';
}
exports.detectOS = detectOS;
function getSeverityColor(severity) {
    const colors = {
        'Critical': '#dc2626',
        'High': '#f97316',
        'Medium': '#eab308',
        'Low': '#22c55e'
    };
    return colors[severity] || '#6b7280';
}
exports.getSeverityColor = getSeverityColor;
function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}
exports.formatDate = formatDate;
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}
exports.copyToClipboard = copyToClipboard;
//# sourceMappingURL=storage.js.map