"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
const storage_1 = require("../utils/storage");
class AnalysisService {
    static async analyzeScreenshot(screenshot, pageUrl) {
        try {
            const settings = await (0, storage_1.getSettings)();
            if (!settings.backendUrl) {
                return {
                    success: false,
                    error: 'Backend URL not configured. Please check settings.'
                };
            }
            const response = await fetch(`${settings.backendUrl}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': settings.apiToken ? `Bearer ${settings.apiToken}` : ''
                },
                body: JSON.stringify({
                    screenshot,
                    pageUrl,
                    apiKey: settings.apiKey
                })
            });
            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                issues: data.issues || [],
                report: data.report
            };
        }
        catch (error) {
            console.error('Analysis error:', error);
            return {
                success: false,
                error: error.message || 'Failed to analyze screenshot'
            };
        }
    }
    static async generateBugReport(screenshot, issues, metadata) {
        try {
            const settings = await (0, storage_1.getSettings)();
            if (!settings.backendUrl) {
                throw new Error('Backend URL not configured');
            }
            const response = await fetch(`${settings.backendUrl}/api/generate-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': settings.apiToken ? `Bearer ${settings.apiToken}` : ''
                },
                body: JSON.stringify({
                    screenshot,
                    issues,
                    metadata,
                    apiKey: settings.apiKey
                })
            });
            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }
            const data = await response.json();
            return data.report;
        }
        catch (error) {
            console.error('Report generation error:', error);
            return null;
        }
    }
    static async generateApiRequests(report) {
        try {
            const settings = await (0, storage_1.getSettings)();
            const response = await fetch(`${settings.backendUrl}/api/generate-api-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': settings.apiToken ? `Bearer ${settings.apiToken}` : ''
                },
                body: JSON.stringify({
                    report,
                    apiKey: settings.apiKey
                })
            });
            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('API request generation error:', error);
            return {};
        }
    }
}
exports.AnalysisService = AnalysisService;
//# sourceMappingURL=analysis.js.map