class APIGenerator {
  static generateCurlForJira(bugReport, jiraBaseUrl, authToken) {
    const payload = {
      fields: {
        project: { key: 'QA' },
        summary: bugReport.title,
        description: this.formatJiraDescription(bugReport),
        priority: { name: this.mapSeverityToJiraPriority(bugReport.severity) },
        issuetype: { name: 'Bug' },
        labels: ['ui-bug', 'auto-generated'],
        customfield_10000: bugReport.environment.browser,
        customfield_10001: bugReport.environment.os
      }
    };

    return this.generateCurl(
      `${jiraBaseUrl}/rest/api/3/issues`,
      'POST',
      payload,
      {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    );
  }

  static generateCurlForClickUp(bugReport, listId, authToken) {
    const payload = {
      name: bugReport.title,
      description: bugReport.description,
      priority: this.mapSeverityToPriority(bugReport.severity),
      custom_fields: [
        {
          id: 'expected_result',
          value: bugReport.expectedBehavior
        },
        {
          id: 'actual_result',
          value: bugReport.actualBehavior
        }
      ]
    };

    return this.generateCurl(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
      'POST',
      payload,
      {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      }
    );
  }

  static generateCurlForCustomAPI(bugReport, endpoint, authToken, method = 'POST') {
    const payload = {
      title: bugReport.title,
      description: bugReport.description,
      severity: bugReport.severity,
      expectedBehavior: bugReport.expectedBehavior,
      actualBehavior: bugReport.actualBehavior,
      reproductionSteps: bugReport.reproductionSteps,
      environment: bugReport.environment,
      timestamp: new Date().toISOString()
    };

    return this.generateCurl(
      endpoint,
      method,
      payload,
      {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    );
  }

  static generateCurl(url, method = 'POST', data = null, headers = {}) {
    let curl = `curl -X ${method} "${url}"`;

    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`;
    });

    // Add data
    if (data) {
      const jsonData = JSON.stringify(data);
      curl += ` \\\n  -d '${jsonData}'`;
    }

    return curl;
  }

  static generatePythonRequest(bugReport, endpoint, authToken) {
    const pythonCode = `import requests
import json

url = "${endpoint}"
headers = {
    "Authorization": "Bearer ${authToken}",
    "Content-Type": "application/json"
}

payload = ${JSON.stringify({
      title: bugReport.title,
      description: bugReport.description,
      severity: bugReport.severity,
      expectedBehavior: bugReport.expectedBehavior,
      actualBehavior: bugReport.actualBehavior,
      reproductionSteps: bugReport.reproductionSteps,
      environment: bugReport.environment
    }, null, 2)}

response = requests.post(url, headers=headers, json=payload)
print(f"Status: {response.status_code}")
print(json.dumps(response.json(), indent=2))`;

    return pythonCode;
  }

  static generateJavaScriptFetch(bugReport, endpoint, authToken) {
    const jsCode = `fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${authToken}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "${bugReport.title.replace(/"/g, '\\"')}",
    description: "${bugReport.description.replace(/"/g, '\\"')}",
    severity: "${bugReport.severity}",
    expectedBehavior: "${bugReport.expectedBehavior.replace(/"/g, '\\"')}",
    actualBehavior: "${bugReport.actualBehavior.replace(/"/g, '\\"')}",
    reproductionSteps: ${JSON.stringify(bugReport.reproductionSteps)},
    environment: ${JSON.stringify(bugReport.environment)}
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error("Error:", error));`;

    return jsCode;
  }

  static mapSeverityToJiraPriority(severity) {
    const map = {
      'Critical': 'Blocker',
      'High': 'High',
      'Medium': 'Medium',
      'Low': 'Low'
    };
    return map[severity] || 'Medium';
  }

  static mapSeverityToPriority(severity) {
    const map = {
      'Critical': 1,
      'High': 2,
      'Medium': 3,
      'Low': 4
    };
    return map[severity] || 3;
  }

  static formatJiraDescription(bugReport) {
    return `*Expected Behavior:*
${bugReport.expectedBehavior}

*Actual Behavior:*
${bugReport.actualBehavior}

*Steps to Reproduce:*
${bugReport.reproductionSteps.map((step, i) => `# ${step}`).join('\n')}

*Environment:*
* Browser: ${bugReport.environment.browser}
* OS: ${bugReport.environment.os}
* Viewport: ${bugReport.environment.viewport}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIGenerator;
}